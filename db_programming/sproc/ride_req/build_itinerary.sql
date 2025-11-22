CREATE OR ALTER PROCEDURE dbo.usp_BuildItineraryForRequest
    @RequestId INT,
    @Debug BIT = 0 -- for testing
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @PickupPointId INT, @DropoffPointId INT;
    DECLARE @OriginZoneId INT, @DestZoneId INT;
    DECLARE @CurrentZone INT;
    DECLARE @SeqNo INT = 1;
    DECLARE @PathFound BIT = 0;

    ----------------------------------------------------------------------
    -- 1. Get pickup/dropoff points from request
    ----------------------------------------------------------------------
    SELECT 
        @PickupPointId = PickUpPoint,
        @DropoffPointId = DropOffPoint
    FROM dbo.RideRequest
    WHERE RequestId = @RequestId;

    IF @PickupPointId IS NULL OR @DropoffPointId IS NULL
    BEGIN
        RAISERROR('Request %d has invalid pickup/dropoff points', 16, 1, @RequestId);
        RETURN;
    END;

    ----------------------------------------------------------------------
    -- 2. Determine origin and destination zones
    ----------------------------------------------------------------------
    SELECT @OriginZoneId = ZoneId FROM dbo.ZonePoint WHERE PointId = @PickupPointId;
    SELECT @DestZoneId   = ZoneId FROM dbo.ZonePoint WHERE PointId = @DropoffPointId;

    IF @OriginZoneId IS NULL OR @DestZoneId IS NULL
    BEGIN
        RAISERROR('Cannot determine zones for request %d', 16, 1, @RequestId);
        RETURN;
    END;

    IF @Debug = 1
        PRINT 'Origin Zone: ' + CAST(@OriginZoneId AS VARCHAR(10)) + ', Dest Zone: ' + CAST(@DestZoneId AS VARCHAR(10));

    ----------------------------------------------------------------------
    -- 3. Easy case: same zone, no bridge crossing -> 1 leg created
    ----------------------------------------------------------------------
    IF @OriginZoneId = @DestZoneId
    BEGIN
        BEGIN TRANSACTION;

        DELETE FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId;

        INSERT INTO dbo.ItineraryLeg (RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId)
        VALUES (@RequestId, 1, @OriginZoneId, @PickupPointId, @DropoffPointId);

        COMMIT TRANSACTION;

        IF @Debug = 1
            SELECT * FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId ORDER BY SeqNo;

        PRINT 'Itinerary built successfully for Request ' + CAST(@RequestId AS VARCHAR(20));
        RETURN;
    END;

    ----------------------------------------------------------------------
    -- 4. BFS over Zones
    ----------------------------------------------------------------------
    CREATE TABLE #Queue (
        ZoneId INT,
        ParentZoneId INT NULL,
        Depth INT
    );

    CREATE TABLE #Visited (
        ZoneId INT PRIMARY KEY,
        ParentZoneId INT NULL
    );

    DECLARE @CurrentDepth INT = 0;
    DECLARE @MaxDepth INT = 10; -- maybe adjust

    -- Initialize queue/visited (with starting zone)
    INSERT INTO #Queue (ZoneId, ParentZoneId, Depth)
    VALUES (@OriginZoneId, NULL, 0);

    INSERT INTO #Visited (ZoneId, ParentZoneId)
    VALUES (@OriginZoneId, NULL);

    WHILE EXISTS (SELECT 1 FROM #Queue WHERE Depth = @CurrentDepth) AND @CurrentDepth < @MaxDepth
    BEGIN
        DECLARE zone_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT ZoneId FROM #Queue WHERE Depth = @CurrentDepth;

        OPEN zone_cursor;
        FETCH NEXT FROM zone_cursor INTO @CurrentZone;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- If reached destination zone
            IF @CurrentZone = @DestZoneId
            BEGIN
                SET @PathFound = 1;
                CLOSE zone_cursor;
                DEALLOCATE zone_cursor;
                BREAK;
            END;

            -- Enqueue neighbours via Bridge
            INSERT INTO #Queue (ZoneId, ParentZoneId, Depth)
            SELECT 
                b.ToZoneId,
                @CurrentZone,
                @CurrentDepth + 1
            FROM dbo.Bridge b
            WHERE b.FromZoneId = @CurrentZone
              AND NOT EXISTS (SELECT 1 FROM #Visited v WHERE v.ZoneId = b.ToZoneId);

            -- Mark as visited
            INSERT INTO #Visited (ZoneId, ParentZoneId)
            SELECT 
                b.ToZoneId,
                @CurrentZone
            FROM dbo.Bridge b
            WHERE b.FromZoneId = @CurrentZone
              AND NOT EXISTS (SELECT 1 FROM #Visited v WHERE v.ZoneId = b.ToZoneId);

            FETCH NEXT FROM zone_cursor INTO @CurrentZone;
        END;

        IF @PathFound = 1
            BREAK;

        CLOSE zone_cursor;
        DEALLOCATE zone_cursor;

        SET @CurrentDepth += 1;
    END;

    IF @PathFound = 0
    BEGIN
        DROP TABLE #Queue;
        DROP TABLE #Visited;
        RAISERROR('No path found from zone %d to zone %d', 16, 1, @OriginZoneId, @DestZoneId);
        RETURN;
    END;

    ----------------------------------------------------------------------
    -- 5. Reconstruct zone path (sequence of FromZone -> ToZone)
    ----------------------------------------------------------------------
    CREATE TABLE #ZonePath (
        SeqNo INT IDENTITY(1,1) NOT NULL,
        FromZoneId INT NOT NULL,
        ToZoneId INT NOT NULL
    );

    SET @CurrentZone = @DestZoneId;

    WHILE @CurrentZone IS NOT NULL AND @CurrentZone <> @OriginZoneId
    BEGIN
        DECLARE @ParentZone INT;

        SELECT @ParentZone = ParentZoneId
        FROM #Visited
        WHERE ZoneId = @CurrentZone;

        IF @ParentZone IS NULL
            BREAK;

        INSERT INTO #ZonePath (FromZoneId, ToZoneId)
        VALUES (@ParentZone, @CurrentZone);

        SET @CurrentZone = @ParentZone;
    END;

    ----------------------------------------------------------------------
    -- 6. For each zone hop, determine ExitPoint (in FromZone)
    --    and EntryPoint (in ToZone, nearest bridge point by lat/lng)
    --    (reverse)
    ----------------------------------------------------------------------
    DECLARE @Edges TABLE (
        EdgeOrder INT IDENTITY(1,1),
        FromZoneId INT,
        ToZoneId INT,
        ExitPointId INT,
        EntryPointId INT
    );

    INSERT INTO @Edges (FromZoneId, ToZoneId, ExitPointId, EntryPointId)
    SELECT 
        z.FromZoneId,
        z.ToZoneId,
        b.PointId AS ExitPointId,
        zpEntry.PointId AS EntryPointId
    FROM #ZonePath z
    -- Bridge gives us the EXIT point in FromZoneId
    JOIN dbo.Bridge b
      ON b.FromZoneId = z.FromZoneId
     AND b.ToZoneId   = z.ToZoneId
    JOIN dbo.ZonePoint zpExit
      ON zpExit.PointId = b.PointId
    -- Find ENTRY point in ToZoneId: closest bridge-type point by coordinates
    CROSS APPLY (
        SELECT TOP (1) zpTo.PointId
        FROM dbo.ZonePoint zpTo
        WHERE zpTo.ZoneId    = z.ToZoneId
          AND zpTo.PointType = 'B'
        ORDER BY zpTo.Location.STDistance(zpExit.Location)
    ) AS zpEntry
    ORDER BY z.SeqNo DESC;  -- reverse: origin->dest order

    ----------------------------------------------------------------------
    -- 7. Build itinerary legs from edges
    ----------------------------------------------------------------------
    BEGIN TRANSACTION;

    DELETE FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId;

    DECLARE 
        @EdgeFromZone INT,
        @EdgeToZone INT,
        @ExitPointId INT,
        @EntryPointId INT;

    SET @SeqNo = 1;
    SET @CurrentZone = @OriginZoneId;
    DECLARE @PrevPointId INT = @PickupPointId;

    DECLARE edge_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT FromZoneId, ToZoneId, ExitPointId, EntryPointId
        FROM @Edges
        ORDER BY EdgeOrder;

    OPEN edge_cursor;
    FETCH NEXT FROM edge_cursor INTO @EdgeFromZone, @EdgeToZone, @ExitPointId, @EntryPointId;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Leg within current zone: prev point -> exit point
        INSERT INTO dbo.ItineraryLeg (RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId)
        VALUES (@RequestId, @SeqNo, @CurrentZone, @PrevPointId, @ExitPointId);

        SET @SeqNo       = @SeqNo + 1;
        SET @CurrentZone = @EdgeToZone;
        SET @PrevPointId = @EntryPointId;

        FETCH NEXT FROM edge_cursor INTO @EdgeFromZone, @EdgeToZone, @ExitPointId, @EntryPointId;
    END;

    CLOSE edge_cursor;
    DEALLOCATE edge_cursor;

    -- Final leg in destination zone: last entry point -> dropoff
    INSERT INTO dbo.ItineraryLeg (RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId)
    VALUES (@RequestId, @SeqNo, @DestZoneId, @PrevPointId, @DropoffPointId);

    COMMIT TRANSACTION;

    DROP TABLE #Queue;
    DROP TABLE #Visited;
    DROP TABLE #ZonePath;

    IF @Debug = 1
        SELECT * FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId ORDER BY SeqNo;

    PRINT 'Itinerary built successfully for Request ' + CAST(@RequestId AS VARCHAR(20));
END;
GO

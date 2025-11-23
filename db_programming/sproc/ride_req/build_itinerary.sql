CREATE OR ALTER PROCEDURE dbo.usp_BuildItineraryForRequest
    @RequestId INT,
    @Debug BIT = 0, -- for testing
    @AvgSpeedKmh DECIMAL(5,2) = 50.0 -- default average speed in km/h
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @PickupPointId INT, @DropoffPointId INT;
    DECLARE @OriginZoneId INT, @DestZoneId INT;
    DECLARE @CurrentZone INT;
    DECLARE @SeqNo INT = 1;
    DECLARE @PathFound BIT = 0;
    DECLARE @PickupTime DATETIME2(0);
    DECLARE @LegId INT;
    DECLARE @SearchRadiusMeters DECIMAL(10,2) = 5000.0; -- 5km default


    ----------------------------------------------------------------------
    -- 1. Get pickup/dropoff points and pickup time from request
    ----------------------------------------------------------------------
    SELECT 
        @PickupPointId = PickUpPoint,
        @DropoffPointId = DropOffPoint,
        @PickupTime = PickupAt
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

        -- Calculate distance and time
        DECLARE @Distance FLOAT;
        DECLARE @DurationMinutes INT;
        
        SELECT @Distance = 
            zpFrom.Location.STDistance(zpTo.Location) / 1000.0 -- convert meters to km
        FROM dbo.ZonePoint zpFrom
        CROSS JOIN dbo.ZonePoint zpTo
        WHERE zpFrom.PointId = @PickupPointId
          AND zpTo.PointId = @DropoffPointId;

        SET @DurationMinutes = CEILING((@Distance / @AvgSpeedKmh) * 60);

        INSERT INTO dbo.ItineraryLeg (
            RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId,
            ApproxStartTime, ApproxEndTime
        )
        VALUES (
            @RequestId, 1, @OriginZoneId, @PickupPointId, @DropoffPointId,
            @PickupTime,
            DATEADD(MINUTE, @DurationMinutes, @PickupTime)
        );

        SET @LegId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;

        IF @Debug = 1
            SELECT * FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId ORDER BY SeqNo;

        PRINT 'Itinerary built successfully for Request ' + CAST(@RequestId AS VARCHAR(20));

        EXEC dbo.usp_DispatchOfferCreation 
            @ItineraryLegId = @LegId,
            @SearchRadiusMeters = @SearchRadiusMeters;

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
    -- 7. Build itinerary legs from edges with time calculations
    ----------------------------------------------------------------------
    BEGIN TRANSACTION;

    DELETE FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId;

    DECLARE 
        @EdgeFromZone INT,
        @EdgeToZone INT,
        @ExitPointId INT,
        @EntryPointId INT,
        @LegDistanceKm FLOAT,
        @LegDurationMin INT,
        @CurrentStartTime DATETIME2(0),
        @CurrentEndTime DATETIME2(0);

    SET @SeqNo = 1;
    SET @CurrentZone = @OriginZoneId;
    DECLARE @PrevPointId INT = @PickupPointId;
    SET @CurrentStartTime = @PickupTime;

    DECLARE edge_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT FromZoneId, ToZoneId, ExitPointId, EntryPointId
        FROM @Edges
        ORDER BY EdgeOrder;

    OPEN edge_cursor;
    FETCH NEXT FROM edge_cursor INTO @EdgeFromZone, @EdgeToZone, @ExitPointId, @EntryPointId;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        -- Calculate distance for this leg segment
        SELECT @LegDistanceKm = 
            zpFrom.Location.STDistance(zpTo.Location) / 1000.0 -- meters to km
        FROM dbo.ZonePoint zpFrom
        CROSS JOIN dbo.ZonePoint zpTo
        WHERE zpFrom.PointId = @PrevPointId
          AND zpTo.PointId = @ExitPointId;

        -- Calculate duration in minutes
        SET @LegDurationMin = CEILING((@LegDistanceKm / @AvgSpeedKmh) * 60);
        SET @CurrentEndTime = DATEADD(MINUTE, @LegDurationMin, @CurrentStartTime);

        -- Leg within current zone: prev point -> exit point
        INSERT INTO dbo.ItineraryLeg (
            RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId,
            ApproxStartTime, ApproxEndTime
        )
        VALUES (
            @RequestId, @SeqNo, @CurrentZone, @PrevPointId, @ExitPointId,
            @CurrentStartTime, @CurrentEndTime
        );

        SET @SeqNo       = @SeqNo + 1;
        SET @CurrentZone = @EdgeToZone;
        SET @PrevPointId = @EntryPointId;
        SET @CurrentStartTime = DATEADD(MINUTE, 2, @CurrentEndTime); -- 2-minute buffer before next leg


        FETCH NEXT FROM edge_cursor INTO @EdgeFromZone, @EdgeToZone, @ExitPointId, @EntryPointId;
    END;

    CLOSE edge_cursor;
    DEALLOCATE edge_cursor;

    -- Calculate final leg distance and time
    SELECT @LegDistanceKm = 
        zpFrom.Location.STDistance(zpTo.Location) / 1000.0
    FROM dbo.ZonePoint zpFrom
    CROSS JOIN dbo.ZonePoint zpTo
    WHERE zpFrom.PointId = @PrevPointId
      AND zpTo.PointId = @DropoffPointId;

    SET @LegDurationMin = CEILING((@LegDistanceKm / @AvgSpeedKmh) * 60);
    SET @CurrentEndTime = DATEADD(MINUTE, @LegDurationMin, @CurrentStartTime);

    -- Final leg in destination zone: last entry point -> dropoff
    INSERT INTO dbo.ItineraryLeg (
        RideRequestId, SeqNo, ZoneId, FromPointId, ToPointId,
        ApproxStartTime, ApproxEndTime
    )
    VALUES (
        @RequestId, @SeqNo, @DestZoneId, @PrevPointId, @DropoffPointId,
        @CurrentStartTime, @CurrentEndTime
    );

    COMMIT TRANSACTION;

    DROP TABLE #Queue;
    DROP TABLE #Visited;
    DROP TABLE #ZonePath;

    IF @Debug = 1
        SELECT * FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId ORDER BY SeqNo;

    PRINT 'Itinerary built successfully for Request ' + CAST(@RequestId AS VARCHAR(20));

    -- Initialize RideRequestProgress
    DECLARE @TotalLegs INT;
    SELECT @TotalLegs = COUNT(*) FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId;
    
    INSERT INTO dbo.RideRequestProgress (RequestId, TotalLegs, AcceptedLegs, Status)
    VALUES (@RequestId, @TotalLegs, 0, 'AwaitingDrivers');
    
    DECLARE leg_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT LegId FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId ORDER BY SeqNo;
    
    OPEN leg_cursor;
    FETCH NEXT FROM leg_cursor INTO @LegId;
    
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC dbo.usp_DispatchOfferCreation 
            @ItineraryLegId = @LegId,
            @SearchRadiusMeters = @SearchRadiusMeters;
        
        FETCH NEXT FROM leg_cursor INTO @LegId;
    END;
    
    CLOSE leg_cursor;
    DEALLOCATE leg_cursor;
    
    IF @Debug = 1
    BEGIN
        PRINT 'Dispatch offers created for all legs';
        SELECT * FROM dbo.DispatchOffer do
        INNER JOIN dbo.ItineraryLeg il ON do.LegId = il.LegId
        WHERE il.RideRequestId = @RequestId;
    END
END;
GO
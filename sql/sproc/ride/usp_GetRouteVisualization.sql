CREATE OR ALTER PROCEDURE dbo.usp_GetRouteVisualization
    @PickupPointId INT,
    @DropoffPointId INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @OriginZoneId INT, @DestZoneId INT;

    -- Get zones for pickup and dropoff points
    SELECT @OriginZoneId = ZoneId FROM dbo.ZonePoint WHERE PointId = @PickupPointId;
    SELECT @DestZoneId   = ZoneId FROM dbo.ZonePoint WHERE PointId = @DropoffPointId;

    IF @OriginZoneId IS NULL OR @DestZoneId IS NULL
    BEGIN
        RAISERROR('Invalid pickup or dropoff point', 16, 1);
        RETURN;
    END;

    -- Same zone: return pickup -> dropoff only
    IF @OriginZoneId = @DestZoneId
    BEGIN
        SELECT
            1 AS SequenceNumber,
            zp.PointId,
            zp.Latitude,
            zp.Longitude,
            zp.PointType,
            zp.Name AS PointName,
            zp.ZoneId,
            CASE WHEN zp.PointId = @PickupPointId THEN 'pickup'
                 WHEN zp.PointId = @DropoffPointId THEN 'dropoff'
                 ELSE 'waypoint' END AS PointRole
        FROM (SELECT @PickupPointId AS PointId, 1 AS Ord
              UNION ALL
              SELECT @DropoffPointId, 2) pts
        JOIN dbo.ZonePoint zp ON zp.PointId = pts.PointId
        ORDER BY pts.Ord;

        RETURN;
    END;

    -- Multi-zone: BFS using temp queue + visited sets
    CREATE TABLE #Queue (ZoneId INT, ParentZoneId INT NULL, Depth INT);
    CREATE TABLE #Visited (ZoneId INT PRIMARY KEY, ParentZoneId INT NULL);

    DECLARE @CurrentZone INT;
    DECLARE @CurrentDepth INT = 0;
    DECLARE @MaxDepth INT = 50; -- allow more hops if needed
    DECLARE @PathFound BIT = 0;

    INSERT INTO #Queue (ZoneId, ParentZoneId, Depth) VALUES (@OriginZoneId, NULL, 0);
    INSERT INTO #Visited (ZoneId, ParentZoneId) VALUES (@OriginZoneId, NULL);

    WHILE EXISTS (SELECT 1 FROM #Queue WHERE Depth = @CurrentDepth) AND @CurrentDepth < @MaxDepth
    BEGIN
        DECLARE zone_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT ZoneId FROM #Queue WHERE Depth = @CurrentDepth;

        OPEN zone_cursor; FETCH NEXT FROM zone_cursor INTO @CurrentZone;
        WHILE @@FETCH_STATUS = 0
        BEGIN
            IF @CurrentZone = @DestZoneId
            BEGIN
                SET @PathFound = 1; CLOSE zone_cursor; DEALLOCATE zone_cursor; BREAK;
            END;

            -- neighbors (From → To)
            INSERT INTO #Queue (ZoneId, ParentZoneId, Depth)
            SELECT b.ToZoneId, @CurrentZone, @CurrentDepth + 1
            FROM dbo.Bridge b
            WHERE b.FromZoneId = @CurrentZone
              AND NOT EXISTS (SELECT 1 FROM #Visited v WHERE v.ZoneId = b.ToZoneId);

            INSERT INTO #Visited (ZoneId, ParentZoneId)
            SELECT b.ToZoneId, @CurrentZone
            FROM dbo.Bridge b
            WHERE b.FromZoneId = @CurrentZone
              AND NOT EXISTS (SELECT 1 FROM #Visited v WHERE v.ZoneId = b.ToZoneId);

            -- neighbors (To → From)
            INSERT INTO #Queue (ZoneId, ParentZoneId, Depth)
            SELECT b.FromZoneId, @CurrentZone, @CurrentDepth + 1
            FROM dbo.Bridge b
            WHERE b.ToZoneId = @CurrentZone
              AND NOT EXISTS (SELECT 1 FROM #Visited v WHERE v.ZoneId = b.FromZoneId);

            INSERT INTO #Visited (ZoneId, ParentZoneId)
            SELECT b.FromZoneId, @CurrentZone
            FROM dbo.Bridge b
            WHERE b.ToZoneId = @CurrentZone
              AND NOT EXISTS (SELECT 1 FROM #Visited v WHERE v.ZoneId = b.FromZoneId);

            FETCH NEXT FROM zone_cursor INTO @CurrentZone;
        END;

        IF @PathFound = 1 BREAK;
        CLOSE zone_cursor; DEALLOCATE zone_cursor;
        SET @CurrentDepth += 1;
    END;

    IF @PathFound = 0
    BEGIN
        DROP TABLE #Queue; DROP TABLE #Visited;
        RAISERROR('No path found between zones', 16, 1);
        RETURN;
    END;

    -- Reconstruct zone path
    CREATE TABLE #ZonePath (SeqNo INT IDENTITY(1,1), FromZoneId INT, ToZoneId INT);
    SET @CurrentZone = @DestZoneId;

    WHILE @CurrentZone IS NOT NULL AND @CurrentZone <> @OriginZoneId
    BEGIN
        DECLARE @ParentZone INT;
        SELECT @ParentZone = ParentZoneId FROM #Visited WHERE ZoneId = @CurrentZone;
        IF @ParentZone IS NULL BREAK;

        INSERT INTO #ZonePath (FromZoneId, ToZoneId) VALUES (@ParentZone, @CurrentZone);
        SET @CurrentZone = @ParentZone;
    END;

    -- Build route waypoints
    DECLARE @RoutePoints TABLE (
        SequenceNumber INT IDENTITY(1,1),
        PointId INT,
        Latitude DECIMAL(9,6),
        Longitude DECIMAL(9,6),
        PointType CHAR(1),
        PointName NVARCHAR(100),
        ZoneId INT,
        PointRole VARCHAR(20)
    );

    -- pickup
    INSERT INTO @RoutePoints
    SELECT PointId, Latitude, Longitude, PointType, Name, ZoneId, 'pickup'
    FROM dbo.ZonePoint WHERE PointId = @PickupPointId;

    DECLARE @FromZ INT, @ToZ INT;

    DECLARE edge_cursor CURSOR LOCAL FAST_FORWARD FOR
        SELECT FromZoneId, ToZoneId FROM #ZonePath ORDER BY SeqNo DESC;

    OPEN edge_cursor;
    FETCH NEXT FROM edge_cursor INTO @FromZ, @ToZ;

    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @BridgeAnchorPointId INT;

        SELECT TOP (1) @BridgeAnchorPointId = b.PointId
        FROM dbo.Bridge b
        WHERE (b.FromZoneId = @FromZ AND b.ToZoneId = @ToZ)
           OR (b.FromZoneId = @ToZ AND b.ToZoneId = @FromZ);

        IF @BridgeAnchorPointId IS NULL
        BEGIN
            INSERT INTO @RoutePoints
            SELECT TOP (1) zp.PointId, zp.Latitude, zp.Longitude, zp.PointType, zp.Name, zp.ZoneId, 'bridge_exit'
            FROM dbo.ZonePoint zp WHERE zp.ZoneId = @FromZ AND zp.PointType = 'B';

            INSERT INTO @RoutePoints
            SELECT TOP (1) zp.PointId, zp.Latitude, zp.Longitude, zp.PointType, zp.Name, zp.ZoneId, 'bridge_entry'
            FROM dbo.ZonePoint zp WHERE zp.ZoneId = @ToZ AND zp.PointType = 'B';
        END
        ELSE
        BEGIN
            DECLARE @AnchorLocation GEOGRAPHY;
            SELECT @AnchorLocation = zp.Location FROM dbo.ZonePoint zp WHERE zp.PointId = @BridgeAnchorPointId;

            INSERT INTO @RoutePoints
            SELECT TOP (1) zpF.PointId, zpF.Latitude, zpF.Longitude, zpF.PointType, zpF.Name, zpF.ZoneId, 'bridge_exit'
            FROM dbo.ZonePoint zpF
            WHERE zpF.ZoneId = @FromZ AND zpF.PointType = 'B'
            ORDER BY zpF.Location.STDistance(@AnchorLocation);

            INSERT INTO @RoutePoints
            SELECT TOP (1) zpT.PointId, zpT.Latitude, zpT.Longitude, zpT.PointType, zpT.Name, zpT.ZoneId, 'bridge_entry'
            FROM dbo.ZonePoint zpT
            WHERE zpT.ZoneId = @ToZ AND zpT.PointType = 'B'
            ORDER BY zpT.Location.STDistance(@AnchorLocation);
        END;

        FETCH NEXT FROM edge_cursor INTO @FromZ, @ToZ;
    END;

    CLOSE edge_cursor; DEALLOCATE edge_cursor;

    INSERT INTO @RoutePoints
    SELECT PointId, Latitude, Longitude, PointType, Name, ZoneId, 'dropoff'
    FROM dbo.ZonePoint WHERE PointId = @DropoffPointId;

    SELECT * FROM @RoutePoints ORDER BY SequenceNumber;

    DROP TABLE #Queue;
    DROP TABLE #Visited;
    DROP TABLE #ZonePath;
END;

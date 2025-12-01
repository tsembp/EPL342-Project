CREATE OR ALTER PROCEDURE dbo.usp_Route_GetAllAlternatives
(
    @PickUpPointId   INT,
    @DropOffPointId  INT,
    @MaxHops         INT = 6,
    @MaxAlternatives INT = 50
)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        DECLARE @StartZoneId INT,
                @EndZoneId   INT;

        ------------------------------------------------------------
        -- 1. Validate pickup / dropoff points and get their zones
        ------------------------------------------------------------
        SELECT @StartZoneId = ZP.ZoneId
        FROM dbo.ZonePoint AS ZP
        WHERE ZP.PointId = @PickUpPointId;

        SELECT @EndZoneId = ZP.ZoneId
        FROM dbo.ZonePoint AS ZP
        WHERE ZP.PointId = @DropOffPointId;

        IF @StartZoneId IS NULL OR @EndZoneId IS NULL
        BEGIN
            ;THROW 51001, 'Invalid pickup or dropoff point.', 1;
        END;

        ------------------------------------------------------------
        -- 2. Normalize / cap parameters
        ------------------------------------------------------------
        IF @MaxHops IS NULL OR @MaxHops <= 0
            SET @MaxHops = 6;

        IF @MaxHops > 8
            SET @MaxHops = 8;   -- hard safety cap

        IF @MaxAlternatives IS NULL OR @MaxAlternatives <= 0
            SET @MaxAlternatives = 50;

        ------------------------------------------------------------
        -- 3. Easy case: same zone -> single "leg" zone→zone
        ------------------------------------------------------------
        IF @StartZoneId = @EndZoneId
        BEGIN
            SELECT
                AlternativeNo = 1,
                SeqNo         = 1,
                FromZoneId    = @StartZoneId,
                ToZoneId      = @EndZoneId;
            RETURN;
        END;

        ------------------------------------------------------------
        -- 4. Build graph & enumerate paths with delimited strings
        --    PathString format: ",3,7,12," (no JSON in recursion)
        ------------------------------------------------------------
        ;WITH Edge AS (
            SELECT B.FromZoneId, B.ToZoneId
            FROM dbo.Bridge AS B
            UNION
            SELECT B.ToZoneId  AS FromZoneId,
                   B.FromZoneId AS ToZoneId
            FROM dbo.Bridge AS B
        ),
        Paths AS (
            -- Anchor
            SELECT
                PathString  = ',' + CAST(@StartZoneId AS varchar(20)) + ',',
                CurrentZone = @StartZoneId,
                Depth       = 0
            UNION ALL
            -- Recursive: extend to neighbours, avoid cycles via CHARINDEX
            SELECT
                PathString  = p.PathString + CAST(e.ToZoneId AS varchar(20)) + ',',
                CurrentZone = e.ToZoneId,
                Depth       = p.Depth + 1
            FROM Paths AS p
            JOIN Edge  AS e
              ON e.FromZoneId = p.CurrentZone
            WHERE p.Depth < @MaxHops
              AND CHARINDEX(',' + CAST(e.ToZoneId AS varchar(20)) + ',', p.PathString) = 0
        ),
        FinalPaths AS (
            -- Only paths that end at destination zone
            SELECT
                PathString,
                Depth
            FROM Paths
            WHERE CurrentZone = @EndZoneId
        ),
        NumberedPaths AS (
            -- Keep only top @MaxAlternatives, order by shortest paths first
            SELECT TOP (@MaxAlternatives)
                AlternativeNo = ROW_NUMBER() OVER (ORDER BY Depth, PathString),
                PathString,
                Depth
            FROM FinalPaths
            ORDER BY Depth, PathString
        ),
        LegNodes AS (
            -- Split PathString into nodes with ordinals
            -- PathString: ",3,7,12," → nodes 3,7,12 with ordinals
            SELECT
                np.AlternativeNo,
                ZoneId  = TRY_CAST(s.value AS int),
                s.ordinal
            FROM NumberedPaths AS np
            CROSS APPLY STRING_SPLIT(np.PathString, ',', 1) AS s
            WHERE s.value <> ''  -- skip empty tokens from leading/trailing commas
        ),
        RawLegs AS (
            -- Build edges between consecutive nodes using LEAD
            SELECT
                AlternativeNo,
                FromZoneId = ZoneId,
                ToZoneId   = LEAD(ZoneId) OVER (PARTITION BY AlternativeNo ORDER BY ordinal),
                ordinal
            FROM LegNodes
        ),
        FinalLegs AS (
            -- Filter out last node (no outgoing edge) and assign SeqNo
            SELECT
                AlternativeNo,
                SeqNo      = ROW_NUMBER() OVER (PARTITION BY AlternativeNo ORDER BY ordinal),
                FromZoneId,
                ToZoneId
            FROM RawLegs
            WHERE ToZoneId IS NOT NULL
        )
        SELECT
            AlternativeNo,
            SeqNo,
            FromZoneId,
            ToZoneId
        FROM FinalLegs
        ORDER BY AlternativeNo, SeqNo
        OPTION (MAXRECURSION 100);

    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

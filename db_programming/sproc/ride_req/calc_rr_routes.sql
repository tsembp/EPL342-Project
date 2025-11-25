-- Note: Bridges are bidirectional, meaning that Bride(fromZone, toZone) can also be accessed Bridge(toZone, fromZone)
CREATE OR ALTER PROCEDURE dbo.usp_Route_GetAllAlternatives
    @PickUpPointId   INT,
    @DropOffPointId  INT,
    @MaxHops         INT = 6,
    @MaxAlternatives INT = 50
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        DECLARE @StartZoneId INT,
                @EndZoneId   INT;

        -- 1. Validate pickup / dropoff points and get their zones
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

        IF @MaxHops <= 0 SET @MaxHops = 6;
        IF @MaxAlternatives <= 0 SET @MaxAlternatives = 50;

        -- 2. Easy case: same zone -> single direct leg
        IF @StartZoneId = @EndZoneId
        BEGIN
            DECLARE @SingleJson nvarchar(max);

            SET @SingleJson =
            (
                SELECT
                    1          AS alternativeNo,
                    JSON_QUERY(
                        (
                            SELECT
                                1                AS seqNo,
                                @StartZoneId     AS fromZoneId,
                                @EndZoneId       AS toZoneId
                            FOR JSON PATH
                        )
                    )          AS legs
                FOR JSON PATH
            );

            SELECT @SingleJson AS AlternativesJson;
            RETURN;
        END;

        ----------------------------------------------------------------
        -- 3. Build the graph, enumerate paths, store in temp table
        ----------------------------------------------------------------

        IF OBJECT_ID('tempdb..#NumberedPaths') IS NOT NULL
            DROP TABLE #NumberedPaths;

        CREATE TABLE #NumberedPaths
        (
            AlternativeNo INT        NOT NULL,
            ZonePath      nvarchar(max) NOT NULL    -- JSON array, e.g. [1,3,5]
        );

        ;WITH Edge AS (
            SELECT B.FromZoneId AS FromZoneId,
                   B.ToZoneId   AS ToZoneId
            FROM dbo.Bridge AS B
            UNION
            SELECT B.ToZoneId   AS FromZoneId,
                   B.FromZoneId AS ToZoneId
            FROM dbo.Bridge AS B
        ),
        Paths AS (
            -- Anchor: path is a JSON array with a single zone, e.g. [3]
            SELECT
                CAST('[' + CAST(@StartZoneId AS varchar(20)) + ']' AS nvarchar(max)) AS ZonePath,
                @StartZoneId AS CurrentZone,
                0            AS Depth
            UNION ALL
            -- Recursive: extend with neighbours, avoiding cycles
            SELECT
                CAST(
                    LEFT(p.ZonePath, LEN(p.ZonePath) - 1)
                    + ',' + CAST(e.ToZoneId AS varchar(20)) + ']'
                    AS nvarchar(max)
                ) AS ZonePath,
                e.ToZoneId AS CurrentZone,
                p.Depth + 1 AS Depth
            FROM Paths AS p
            JOIN Edge  AS e
              ON e.FromZoneId = p.CurrentZone
            WHERE p.Depth < @MaxHops
              AND NOT EXISTS (
                    SELECT 1
                    FROM OPENJSON(p.ZonePath) AS z
                    WHERE CAST(z.value AS int) = e.ToZoneId   -- no cycles
              )
        ),
        FinalPaths AS (
            -- only those that end at the destination zone
            SELECT DISTINCT
                   ZonePath,
                   Depth
            FROM Paths
            WHERE CurrentZone = @EndZoneId
        )
        INSERT INTO #NumberedPaths (AlternativeNo, ZonePath)
        SELECT TOP (@MaxAlternatives)
               ROW_NUMBER() OVER (ORDER BY Depth, ZonePath) AS AlternativeNo,
               ZonePath
        FROM FinalPaths
        ORDER BY Depth, ZonePath
        OPTION (MAXRECURSION 100);

        ----------------------------------------------------------------
        -- 4. Turn ZonePath JSON arrays into legs using OPENJSON
        ----------------------------------------------------------------
        ;WITH Legs AS (
            SELECT
                np.AlternativeNo,
                CAST(z_prev.value AS int) AS FromZoneId,
                CAST(z_next.value AS int) AS ToZoneId,
                CAST(z_next.[key] AS int) AS SeqNo
            FROM #NumberedPaths AS np
            CROSS APPLY OPENJSON(np.ZonePath) AS z_prev
            CROSS APPLY OPENJSON(np.ZonePath) AS z_next
            WHERE CAST(z_next.[key] AS int) = CAST(z_prev.[key] AS int) + 1
        )
        -- 5. Build final JSON: one object per alternative, with legs
        SELECT
            (
                SELECT
                    ap.AlternativeNo AS alternativeNo,
                    JSON_QUERY(
                        (
                            SELECT
                                l.SeqNo      AS seqNo,
                                l.FromZoneId AS fromZoneId,
                                l.ToZoneId   AS toZoneId
                            FROM Legs AS l
                            WHERE l.AlternativeNo = ap.AlternativeNo
                            ORDER BY l.SeqNo
                            FOR JSON PATH
                        )
                    ) AS legs
                FROM (SELECT DISTINCT AlternativeNo FROM Legs) AS ap
                ORDER BY ap.AlternativeNo
                FOR JSON PATH
            ) AS AlternativesJson;

    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END;
GO

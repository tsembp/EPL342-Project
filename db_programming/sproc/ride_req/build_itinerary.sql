CREATE OR ALTER PROCEDURE dbo.usp_RideRequest_SaveItineraryFromAlternative
    @RequestId     INT,
    @ItineraryJson NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        ------------------------------------------------
        -- 1. Validate RideRequest
        ------------------------------------------------
        IF NOT EXISTS (SELECT 1 FROM dbo.RideRequest WHERE RequestId = @RequestId)
        BEGIN
            RAISERROR('RideRequest not found.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        ------------------------------------------------
        -- 2. Remove old legs
        ------------------------------------------------
        DELETE FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId;

        ------------------------------------------------
        -- 3. Load legs from JSON
        ------------------------------------------------
        DECLARE @Legs TABLE (
            SeqNo      INT,
            FromZoneId INT,
            ToZoneId   INT
        );

        INSERT INTO @Legs
        SELECT seqNo, fromZoneId, toZoneId
        FROM OPENJSON(@ItineraryJson, '$.legs')
            WITH (
                seqNo INT '$.seqNo',
                fromZoneId INT '$.fromZoneId',
                toZoneId INT '$.toZoneId'
            );

        ------------------------------------------------
        -- 4. Pickup / Dropoff Points
        ------------------------------------------------
        DECLARE @PickupAt DATETIME2(3),
                @PickupPointId INT,
                @DropOffPointId INT;

        SELECT
            @PickupAt       = PickupAt,
            @PickupPointId  = PickUpPoint,
            @DropOffPointId = DropOffPoint
        FROM dbo.RideRequest
        WHERE RequestId = @RequestId;

        IF @PickupPointId IS NULL OR @DropOffPointId IS NULL
        BEGIN
            RAISERROR('Pickup or Dropoff missing.', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        DECLARE @DropZoneId INT = (SELECT ZoneId FROM dbo.ZonePoint WHERE PointId = @DropOffPointId);
        DECLARE @MaxSeqNo INT = (SELECT MAX(SeqNo) FROM @Legs);

        ------------------------------------------------
        -- 5. Insert Legs
        ------------------------------------------------
        DECLARE @CurrentStartTime DATETIME2(3) = @PickupAt;
        DECLARE @TotalElapsedMinutes INT = 0;

        DECLARE @Inserted TABLE (LegId INT);

        DECLARE @SeqNo INT, @FromZoneId INT, @ToZoneId INT;

        DECLARE cur CURSOR LOCAL FAST_FORWARD FOR
            SELECT SeqNo, FromZoneId, ToZoneId
            FROM @Legs
            ORDER BY SeqNo;

        OPEN cur;
        FETCH NEXT FROM cur INTO @SeqNo, @FromZoneId, @ToZoneId;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            DECLARE @FromPointId INT;
            DECLARE @ToPointId INT;

            --------------------------------------------
            -- FROM POINT
            --------------------------------------------
            IF @SeqNo = 1
            BEGIN
                SET @FromPointId = @PickupPointId;
            END
            ELSE
            BEGIN
                SELECT TOP 1 @FromPointId = ToPointId
                FROM dbo.ItineraryLeg
                WHERE RideRequestId = @RequestId
                ORDER BY SeqNo DESC;
            END;

            --------------------------------------------
            -- TO POINT (correctly handle LAST LEG)
            --------------------------------------------
            IF @SeqNo = @MaxSeqNo AND @ToZoneId = @DropZoneId
            BEGIN
                -- LAST LEG → MUST END AT DROP OFF POINT
                SET @ToPointId = @DropOffPointId;
            END
            ELSE
            BEGIN
                -- Choose bridge point in the next zone
                SELECT TOP 1 @ToPointId = zp.PointId
                FROM dbo.ZonePoint zp
                WHERE zp.ZoneId = @ToZoneId
                  AND zp.PointType = 'B'
                ORDER BY zp.PointId;

                IF @ToPointId IS NULL
                BEGIN
                    SELECT TOP 1 @ToPointId = zp.PointId
                    FROM dbo.ZonePoint zp
                    WHERE zp.ZoneId = @ToZoneId
                    ORDER BY zp.PointId;
                END
            END;

            --------------------------------------------
            -- SAFETY CHECK
            --------------------------------------------
            IF @FromPointId IS NULL OR @ToPointId IS NULL
            BEGIN
                RAISERROR('Point resolution error.', 16, 1);
                ROLLBACK;
                RETURN;
            END;

            --------------------------------------------
            -- Distance
            --------------------------------------------
            DECLARE @DistanceKm FLOAT =
            (
                SELECT zpFrom.Location.STDistance(zpTo.Location) / 1000.0
                FROM dbo.ZonePoint zpFrom
                CROSS JOIN dbo.ZonePoint zpTo
                WHERE zpFrom.PointId = @FromPointId
                  AND zpTo.PointId   = @ToPointId
            );

            DECLARE @DurationMinutes INT = CEILING((@DistanceKm / 50.0) * 60.0);

            SET @TotalElapsedMinutes += @DurationMinutes;

            --------------------------------------------
            -- Insert leg
            --------------------------------------------
            INSERT INTO dbo.ItineraryLeg
            (
                RideRequestId, SeqNo, ZoneId,
                FromPointId, ToPointId,
                ApproxStartTime, ApproxEndTime
            )
            OUTPUT INSERTED.LegId INTO @Inserted
            VALUES
            (
                @RequestId, @SeqNo, @FromZoneId,
                @FromPointId, @ToPointId,
                DATEADD(MINUTE, @TotalElapsedMinutes - @DurationMinutes, @PickupAt),
                DATEADD(MINUTE, @TotalElapsedMinutes, @PickupAt)
            );

            FETCH NEXT FROM cur INTO @SeqNo, @FromZoneId, @ToZoneId;
        END;

        CLOSE cur;
        DEALLOCATE cur;

        SELECT LegId FROM @Inserted ORDER BY LegId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
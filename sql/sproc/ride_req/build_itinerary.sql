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
        -- 5. Insert Legs (with bridge point splitting)
        ------------------------------------------------
        DECLARE @CurrentStartTime DATETIME2(3) = @PickupAt;
        DECLARE @TotalElapsedMinutes INT = 0;
        DECLARE @PhysicalSeqNo INT = 0; -- Actual leg sequence number

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
            DECLARE @BridgePointId INT = NULL;

            --------------------------------------------
            -- Determine FROM POINT
            --------------------------------------------
            IF @SeqNo = 1
            BEGIN
                SET @FromPointId = @PickupPointId;
            END
            ELSE
            BEGIN
                -- Get the last inserted ToPointId
                SELECT TOP 1 @FromPointId = ToPointId
                FROM dbo.ItineraryLeg
                WHERE RideRequestId = @RequestId
                ORDER BY SeqNo DESC;
            END;

            --------------------------------------------
            -- Check if this is a cross-zone leg
            --------------------------------------------
            IF @FromZoneId <> @ToZoneId
            BEGIN
                -- Find the bridge point between these zones
                SELECT TOP 1 @BridgePointId = zp.PointId
                FROM dbo.ZonePoint zp
                INNER JOIN dbo.Bridge b 
                    ON (b.PointId = zp.PointId)
                WHERE zp.PointType = 'B'
                  AND ((b.FromZoneId = @FromZoneId AND b.ToZoneId = @ToZoneId)
                    OR (b.FromZoneId = @ToZoneId AND b.ToZoneId = @FromZoneId))
                ORDER BY zp.PointId;

                IF @BridgePointId IS NULL
                BEGIN
                    RAISERROR('No bridge point found between zones.', 16, 1);
                    ROLLBACK;
                    RETURN;
                END;

                --------------------------------------------
                -- INSERT FIRST LEG: FromPoint → BridgePoint (in FromZone)
                --------------------------------------------
                SET @PhysicalSeqNo += 1;
                
                DECLARE @DistanceKm1 FLOAT =
                (
                    SELECT zpFrom.Location.STDistance(zpTo.Location) / 1000.0
                    FROM dbo.ZonePoint zpFrom
                    CROSS JOIN dbo.ZonePoint zpTo
                    WHERE zpFrom.PointId = @FromPointId
                      AND zpTo.PointId   = @BridgePointId
                );

                DECLARE @DurationMinutes1 INT = CEILING((@DistanceKm1 / 50.0) * 60.0);
                SET @TotalElapsedMinutes += @DurationMinutes1;

                INSERT INTO dbo.ItineraryLeg
                (
                    RideRequestId, SeqNo, ZoneId,
                    FromPointId, ToPointId,
                    ApproxStartTime, ApproxEndTime
                )
                OUTPUT INSERTED.LegId INTO @Inserted
                VALUES
                (
                    @RequestId, @PhysicalSeqNo, @FromZoneId,
                    @FromPointId, @BridgePointId,
                    DATEADD(MINUTE, @TotalElapsedMinutes - @DurationMinutes1, @PickupAt),
                    DATEADD(MINUTE, @TotalElapsedMinutes, @PickupAt)
                );

                --------------------------------------------
                -- INSERT SECOND LEG: BridgePoint → ToPoint (in ToZone)
                --------------------------------------------
                SET @PhysicalSeqNo += 1;

                -- Determine the ToPoint for this leg
                IF @SeqNo = @MaxSeqNo
                BEGIN
                    -- Last logical leg → end at dropoff point
                    SET @ToPointId = @DropOffPointId;
                END
                ELSE
                BEGIN
                    -- Not the last leg → this shouldn't happen for simple adjacent zones
                    -- But if it does, we'll end at the bridge point and next leg starts from there
                    SET @ToPointId = @BridgePointId;
                END;

                DECLARE @DistanceKm2 FLOAT =
                (
                    SELECT zpFrom.Location.STDistance(zpTo.Location) / 1000.0
                    FROM dbo.ZonePoint zpFrom
                    CROSS JOIN dbo.ZonePoint zpTo
                    WHERE zpFrom.PointId = @BridgePointId
                      AND zpTo.PointId   = @ToPointId
                );

                DECLARE @DurationMinutes2 INT = CEILING((@DistanceKm2 / 50.0) * 60.0);
                SET @TotalElapsedMinutes += @DurationMinutes2;

                INSERT INTO dbo.ItineraryLeg
                (
                    RideRequestId, SeqNo, ZoneId,
                    FromPointId, ToPointId,
                    ApproxStartTime, ApproxEndTime
                )
                OUTPUT INSERTED.LegId INTO @Inserted
                VALUES
                (
                    @RequestId, @PhysicalSeqNo, @ToZoneId,
                    @BridgePointId, @ToPointId,
                    DATEADD(MINUTE, @TotalElapsedMinutes - @DurationMinutes2, @PickupAt),
                    DATEADD(MINUTE, @TotalElapsedMinutes, @PickupAt)
                );
            END
            ELSE
            BEGIN
                --------------------------------------------
                -- Same zone: single leg
                --------------------------------------------
                SET @PhysicalSeqNo += 1;

                -- For same-zone, end at dropoff if this is the last leg
                IF @SeqNo = @MaxSeqNo
                BEGIN
                    SET @ToPointId = @DropOffPointId;
                END
                ELSE
                BEGIN
                    -- Pick any point in the zone (shouldn't normally happen)
                    SELECT TOP 1 @ToPointId = zp.PointId
                    FROM dbo.ZonePoint zp
                    WHERE zp.ZoneId = @ToZoneId
                    ORDER BY zp.PointId;
                END;

                IF @FromPointId IS NULL OR @ToPointId IS NULL
                BEGIN
                    RAISERROR('Point resolution error.', 16, 1);
                    ROLLBACK;
                    RETURN;
                END;

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

                INSERT INTO dbo.ItineraryLeg
                (
                    RideRequestId, SeqNo, ZoneId,
                    FromPointId, ToPointId,
                    ApproxStartTime, ApproxEndTime
                )
                OUTPUT INSERTED.LegId INTO @Inserted
                VALUES
                (
                    @RequestId, @PhysicalSeqNo, @FromZoneId,
                    @FromPointId, @ToPointId,
                    DATEADD(MINUTE, @TotalElapsedMinutes - @DurationMinutes, @PickupAt),
                    DATEADD(MINUTE, @TotalElapsedMinutes, @PickupAt)
                );
            END;

            FETCH NEXT FROM cur INTO @SeqNo, @FromZoneId, @ToZoneId;
        END;

        -- Insert Request Progress record 
        IF NOT EXISTS(SELECT 1 FROM dbo.RideRequestProgress WHERE RequestId = @RequestId)
        BEGIN
            DECLARE @TotalLegs INT = (SELECT COUNT(*) FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId);
            INSERT INTO dbo.RideRequestProgress (RequestId, TotalLegs, AcceptedLegs, Status)
            VALUES (@RequestId, @TotalLegs, 0, 'AwaitingDrivers');
        END

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
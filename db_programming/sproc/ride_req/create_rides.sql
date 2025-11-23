CREATE OR ALTER PROCEDURE [dbo].[usp_CreateRidesForCompletedRequest]
    @RequestId INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validate that all legs have exactly one accepted offer
        DECLARE @TotalLegs INT;
        DECLARE @AcceptedLegs INT;

        SELECT 
            @TotalLegs = COUNT(DISTINCT il.LegId),
            @AcceptedLegs = COUNT(DISTINCT do_offer.LegId)
        FROM [dbo].[ItineraryLeg] il
        LEFT JOIN [dbo].[DispatchOffer] do_offer
            ON do_offer.LegId = il.LegId
        AND do_offer.Status = 'Accepted'
        WHERE il.RideRequestId = @RequestId;

        IF @TotalLegs IS NULL OR @TotalLegs = 0
        BEGIN
            RAISERROR('No itinerary legs found for RequestId %d', 16, 1, @RequestId);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        IF @AcceptedLegs < @TotalLegs
        BEGIN
            RAISERROR('Not all legs have accepted offers. Accepted: %d, Total: %d', 16, 1, @AcceptedLegs, @TotalLegs);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- Get PassengerId from RideRequest
        DECLARE @PassengerId UNIQUEIDENTIFIER;
        SELECT @PassengerId = PassengerId 
        FROM [dbo].[RideRequest] 
        WHERE RequestId = @RequestId;

        IF @PassengerId IS NULL
        BEGIN
            RAISERROR('RideRequest %d not found', 16, 1, @RequestId);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- Create Ride records for each leg with accepted offer
        DECLARE @LegId INT;
        DECLARE @OfferId INT;
        DECLARE @DriverUserId UNIQUEIDENTIFIER;
        DECLARE @VehicleId UNIQUEIDENTIFIER;
        DECLARE @ApproxStartTime DATETIME2(0);
        DECLARE @ApproxEndTime DATETIME2(0);
        DECLARE @FromPointId INT;
        DECLARE @ToPointId INT;
        DECLARE @DistanceKm DECIMAL(10,2);
        DECLARE @DurationMinutes INT;

        DECLARE leg_cursor CURSOR LOCAL FAST_FORWARD FOR
            SELECT 
                il.LegId,
                il.FromPointId,
                il.ToPointId,
                il.ApproxStartTime,
                il.ApproxEndTime
            FROM [dbo].[ItineraryLeg] il
            WHERE il.RideRequestId = @RequestId
            ORDER BY il.SeqNo;

        OPEN leg_cursor;
        FETCH NEXT FROM leg_cursor INTO @LegId, @FromPointId, @ToPointId, @ApproxStartTime, @ApproxEndTime;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            -- Get accepted offer for this leg
            SELECT TOP 1 @OfferId = OfferId
            FROM [dbo].[DispatchOffer]
            WHERE LegId = @LegId 
            AND Status = 'Accepted';

            IF @OfferId IS NULL
            BEGIN
                RAISERROR('No accepted offer found for LegId %d', 16, 1, @LegId);
                ROLLBACK TRANSACTION;
                RETURN;
            END;

            -- Get driver and vehicle from the accepted offer
            SELECT 
                @DriverUserId = enroll.UserId,
                @VehicleId = enroll.VehicleId
            FROM [dbo].[DispatchOffer] do_offer
            INNER JOIN [dbo].[UserServiceEnrollment] enroll ON do_offer.RecipientUserId = enroll.UserId
            WHERE do_offer.OfferId = @OfferId;

            IF @DriverUserId IS NULL OR @VehicleId IS NULL
            BEGIN
                RAISERROR('Could not find driver/vehicle for OfferId %d', 16, 1, @OfferId);
                ROLLBACK TRANSACTION;
                RETURN;
            END;

            -- Calculate distance between FromPoint and ToPoint using geography
            SELECT @DistanceKm = 
                ROUND(zpFrom.Location.STDistance(zpTo.Location) / 1000.0, 2) -- meters to km
            FROM [dbo].[ZonePoint] zpFrom
            CROSS JOIN [dbo].[ZonePoint] zpTo
            WHERE zpFrom.PointId = @FromPointId
              AND zpTo.PointId = @ToPointId;

            -- Calculate duration in minutes from timestamps
            SET @DurationMinutes = DATEDIFF(MINUTE, @ApproxStartTime, @ApproxEndTime);

            -- Create Ride record
            INSERT INTO [dbo].[Ride] (
                OfferId,
                DriverUserId,
                PassengerUserId,
                VehicleId,
                StartedAt,
                EndedAt,
                DistanceKm,
                DurationMinutes,
                PriceFinal,
                Status
            )
            VALUES (
                @OfferId,
                @DriverUserId,
                @PassengerId,
                @VehicleId,
                @ApproxStartTime,
                @ApproxEndTime,
                @DistanceKm,
                @DurationMinutes,
                0.00,  -- Price will be calculated when ride completes
                'Scheduled'
            );

            FETCH NEXT FROM leg_cursor INTO @LegId, @FromPointId, @ToPointId, @ApproxStartTime, @ApproxEndTime;
        END;

        CLOSE leg_cursor;
        DEALLOCATE leg_cursor;

        -- Update RideRequestProgress to 'RidesCreated'
        UPDATE [dbo].[RideRequestProgress]
        SET 
            Status = 'RidesCreated',
            UpdatedAt = GETUTCDATE()
        WHERE RequestId = @RequestId;

        -- Update RideRequest status to 'Accepted'
        UPDATE [dbo].[RideRequest]
        SET 
            Status = 'Accepted',
            UpdatedAt = GETUTCDATE()
        WHERE RequestId = @RequestId;

        COMMIT TRANSACTION;

        -- Return summary
        SELECT 
            @RequestId AS RequestId,
            @TotalLegs AS TotalLegs,
            COUNT(*) AS RidesCreated,
            'SUCCESS' AS Result
        FROM [dbo].[Ride] r
        INNER JOIN [dbo].[DispatchOffer] do_offer ON r.OfferId = do_offer.OfferId
        INNER JOIN [dbo].[ItineraryLeg] il ON do_offer.LegId = il.LegId
        WHERE il.RideRequestId = @RequestId;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
    END CATCH
END;
GO
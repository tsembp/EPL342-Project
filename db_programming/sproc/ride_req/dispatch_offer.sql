-- Send dispatch offers for leg to eligible drivers
CREATE OR ALTER PROCEDURE [dbo].[usp_DispatchOfferCreation]
    @ItineraryLegId INT,
    @SearchRadiusMeters DECIMAL(10,2) = 5000.0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Default zero or null -> 5km
        IF @SearchRadiusMeters IS NULL OR @SearchRadiusMeters <= 0
            SET @SearchRadiusMeters = 5000.0;

        -- Get leg and ride request details
        DECLARE @RideRequestId INT,
                @RideProfileId UNIQUEIDENTIFIER,
                @ZoneId INT,
                @FromPointId INT,
                @PickupLocation GEOGRAPHY,
                @PickupTime DATETIME2(0);

        SELECT 
            @RideRequestId = leg.RideRequestId,
            @RideProfileId = rr.RideProfileId,
            @ZoneId = leg.ZoneId,
            @FromPointId = leg.FromPointId,
            @PickupLocation = zp.Location,
            @PickupTime = leg.ApproxStartTime
        FROM [dbo].[ItineraryLeg] leg
        INNER JOIN [dbo].[RideRequest] rr ON leg.RideRequestId = rr.RequestId
        INNER JOIN [dbo].[ZonePoint] zp ON leg.FromPointId = zp.PointId
        WHERE leg.LegId = @ItineraryLegId;

        -- Validate leg exists
        IF @RideRequestId IS NULL
        BEGIN
            RAISERROR('Itinerary leg not found', 16, 1);
            RETURN;
        END

        -- Get ride profile components
        DECLARE @ServiceTypeId INT,
                @RideTypeId INT,
                @VehicleTypeId INT;

        SELECT 
            @ServiceTypeId = ServiceTypeId,
            @RideTypeId = RideTypeId,
            @VehicleTypeId = VehicleTypeId
        FROM [dbo].[AllowedRideProfile]
        WHERE RideProfileId = @RideProfileId;

        -- Get leg time window
        DECLARE @BufferMinutes INT = 10; -- +/- 10 mins
        DECLARE @LegStartTime DATETIME2(0), @LegEndTime DATETIME2(0);
        SELECT @LegStartTime = DATEADD(MINUTE, -@BufferMinutes, ApproxStartTime), 
               @LegEndTime = DATEADD(MINUTE, @BufferMinutes, ApproxEndTime) -- +/- 10 mins for plain conflict check
        FROM [dbo].[ItineraryLeg]
        WHERE LegId = @ItineraryLegId;

        -- Find eligible drivers WITHOUT time conflicts
        INSERT INTO [dbo].[DispatchOffer] ([LegId], [RecipientUserId], [EnrollId], [Status], [SentAt])
        SELECT DISTINCT
            @ItineraryLegId,
            enroll.UserId,
            enroll.EnrollId,
            'Sent',
            GETUTCDATE()
        FROM [dbo].[UserServiceEnrollment] enroll
        INNER JOIN [dbo].[User] u ON enroll.UserId = u.UserId
        INNER JOIN [dbo].[DriverAvailability] avail ON enroll.EnrollId = avail.EnrollId
        INNER JOIN [dbo].[VehicleLocationLive] vloc ON enroll.VehicleId = vloc.VehicleId
        INNER JOIN [dbo].[Vehicle] v ON enroll.VehicleId = v.VehicleId
        WHERE 
            (u.Role = 'D' OR u.Role = 'C')
            AND enroll.ServiceType = @ServiceTypeId
            AND enroll.RideType = @RideTypeId
            AND v.VehicleTypeId = @VehicleTypeId
            AND enroll.Status = 'Approved'
            AND v.Verified = 1
            AND v.Status = 'Active'
            AND avail.GeofencezoneId = @ZoneId
            AND avail.AvailabilityDate = CAST(@PickupTime AS DATE)
            AND CAST(@PickupTime AS TIME(0)) BETWEEN avail.StartsAt AND avail.EndsAt
            -- AND vloc.Location.STDistance(@PickupLocation) <= @SearchRadiusMeters
            -- NEW: Check no overlapping rides
            AND NOT EXISTS (
                SELECT 1 
                FROM [dbo].[Ride] existing_ride
                INNER JOIN [dbo].[DispatchOffer] do_offer ON existing_ride.OfferId = do_offer.OfferId
                INNER JOIN [dbo].[ItineraryLeg] il ON do_offer.LegId = il.LegId
                WHERE existing_ride.DriverUserId = enroll.UserId
                    AND existing_ride.Status IN ('Scheduled', 'InProgress')
                    AND (@LegStartTime < il.ApproxEndTime AND @LegEndTime > il.ApproxStartTime)
            )
            -- Existing checks
            AND NOT EXISTS (
                SELECT 1 
                FROM [dbo].[Ride] active_ride
                WHERE active_ride.DriverUserId = enroll.UserId
                AND active_ride.Status = 'InProgress'
            )
            AND NOT EXISTS (
                SELECT 1 
                FROM [dbo].[DispatchOffer] existing
                WHERE existing.LegId = @ItineraryLegId
                AND existing.RecipientUserId = enroll.UserId
            );

        COMMIT TRANSACTION;
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


-- Accept dispatch offer from receiving driver/comp.repr
CREATE OR ALTER PROCEDURE dbo.usp_DispatchOffer_Accept
    @OfferId        INT,
    @UserId         UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @LegId       INT;
        DECLARE @RequestId   INT;
        DECLARE @CurrentStatus NVARCHAR(100);

        ------------------------------------------------
        -- 1. Load offer + basic validation
        ------------------------------------------------
        SELECT 
            @LegId       = dof.LegId,
            @CurrentStatus = dof.Status
        FROM dbo.DispatchOffer dof
        WHERE dof.OfferId = @OfferId
          AND dof.RecipientUserId = @UserId;

        IF @LegId IS NULL
        BEGIN
            RAISERROR('Offer not found for this user.', 16, 1);
        END;

        IF @CurrentStatus <> 'Sent'
        BEGIN
            RAISERROR('Offer is no longer available for acceptance.', 16, 1);
        END;

        ------------------------------------------------
        -- 2. Protect against accepting an already accepted/expired/declined offer
        ------------------------------------------------
        IF EXISTS (
            SELECT 1 
            FROM dbo.DispatchOffer 
            WHERE LegId = @LegId 
              AND Status IN ('Accepted', 'Expired', 'Declined')
        )
        BEGIN
            RAISERROR('This offer has already been accepted/expired/declined.', 16, 1);
        END;

        ------------------------------------------------
        -- 3. Update this offer -> Accepted
        ------------------------------------------------
        UPDATE dbo.DispatchOffer
        SET Status      = 'Accepted',
            RespondedAt = SYSUTCDATETIME()
        WHERE OfferId = @OfferId
          AND Status   = 'Sent';

        IF @@ROWCOUNT = 0
        BEGIN
            -- Race condition; treat like conflict
            RAISERROR('Offer cannot be accepted (already processed).', 16, 1);
        END;

        ------------------------------------------------
        -- 4. Expire all other SENT offers for this leg
        ------------------------------------------------
        UPDATE dbo.DispatchOffer
        SET Status      = 'Expired',
            RespondedAt = COALESCE(RespondedAt, SYSUTCDATETIME())
        WHERE LegId = @LegId
          AND Status = 'Sent'
          AND OfferId <> @OfferId;

        ------------------------------------------------
        -- 5. Update RideRequestProgress.AcceptedLegs / Status
        ------------------------------------------------
        SELECT @RequestId = il.RideRequestId
        FROM dbo.ItineraryLeg il
        WHERE il.LegId = @LegId;

        DECLARE @TotalLegs INT = (SELECT COUNT(*) FROM dbo.ItineraryLeg WHERE RideRequestId = @RequestId);

        UPDATE dbo.RideRequestProgress
        SET AcceptedLegs = AcceptedLegs + 1,
            Status = CASE 
                        WHEN AcceptedLegs + 1 = @TotalLegs 
                            THEN 'AllAccepted'
                        ELSE [Status]
                        END,
            UpdatedAt = SYSUTCDATETIME()
        WHERE RequestId = @RequestId;

        ------------------------------------------------
        -- 6. If all legs accepted → create Rides
        ------------------------------------------------
        DECLARE @NewStatus NVARCHAR(50);

        SELECT @NewStatus = Status
        FROM dbo.RideRequestProgress
        WHERE RequestId = @RequestId;

        IF @NewStatus = 'AllAccepted'
        BEGIN
            EXEC dbo.usp_CreateRidesForCompletedRequest @RequestId;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO


-- Decline dispatch offer from reiceiving driver/comp. repr
CREATE OR ALTER PROCEDURE dbo.usp_DispatchOffer_Decline
    @OfferId        INT,
    @UserId         UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @LegId         INT;
        DECLARE @RequestId     INT;
        DECLARE @CurrentStatus NVARCHAR(100);

        ------------------------------------------------
        -- 1. Load offer and basic checks
        ------------------------------------------------
        SELECT 
            @LegId         = dof.LegId,
            @CurrentStatus = dof.Status
        FROM dbo.DispatchOffer dof
        WHERE dof.OfferId = @OfferId
          AND dof.RecipientUserId = @UserId;

        IF @LegId IS NULL
        BEGIN
            RAISERROR('Offer not found for this user.', 16, 1);
        END;

        IF @CurrentStatus <> 'Sent'
        BEGIN
            -- Cannot decline if already accepted, declined or expired
            RAISERROR('Offer cannot be declined in its current status.', 16, 1);
        END;

        ------------------------------------------------
        -- 2. Mark offer as Declined
        ------------------------------------------------
        UPDATE dbo.DispatchOffer
        SET Status      = 'Declined',
            RespondedAt = SYSUTCDATETIME()
        WHERE OfferId = @OfferId
          AND Status   = 'Sent';

        IF @@ROWCOUNT = 0
        BEGIN
            RAISERROR('Offer cannot be declined (already processed).', 16, 1);
        END;

        ------------------------------------------------
        -- 3. If this leg has no open/accepted offers left → RideRequestProgress = Failed
        ------------------------------------------------
        DECLARE @HasOpenOffers     INT;
        DECLARE @HasAcceptedForLeg INT;

        SELECT @HasOpenOffers = COUNT(*)
        FROM dbo.DispatchOffer
        WHERE LegId = @LegId
        AND Status IN ('Sent');

        SELECT @HasAcceptedForLeg = COUNT(*)
        FROM dbo.DispatchOffer
        WHERE LegId = @LegId
        AND Status = 'Accepted';

        IF @HasOpenOffers = 0       -- no Sent/Pending left
        AND @HasAcceptedForLeg = 0   -- and nothing Accepted
        BEGIN
            UPDATE dbo.RideRequestProgress
            SET Status    = 'Failed',
                UpdatedAt = SYSUTCDATETIME()
            WHERE RequestId = @RequestId
            AND Status NOT IN ('AllAccepted', 'RidesCreated');
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

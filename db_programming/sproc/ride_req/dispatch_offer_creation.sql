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
            @PickupTime = rr.PickupAt
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

        -- Find eligible drivers 
        INSERT INTO [dbo].[DispatchOffer] ([LegId], [RecipientUserId], [Status], [SentAt])
        SELECT DISTINCT
            @ItineraryLegId,
            enroll.UserId,
            'Sent',
            GETUTCDATE()
        FROM [dbo].[UserServiceEnrollment] enroll
        INNER JOIN [dbo].[User] u
            ON enroll.UserId = u.UserId
        INNER JOIN [dbo].[DriverAvailability] avail
            ON enroll.EnrollId = avail.EnrollId
        INNER JOIN [dbo].[VehicleLocationLive] vloc
            ON enroll.VehicleId = vloc.VehicleId
        INNER JOIN [dbo].[Vehicle] v 
            ON enroll.VehicleId = v.VehicleId
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
            AND vloc.Location.STDistance(@PickupLocation) <= @SearchRadiusMeters
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

        -- Return count of offers created
        SELECT @@ROWCOUNT AS OffersCreated;

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
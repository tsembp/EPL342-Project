-- =============================================
-- Create Ride Request
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[usp_RideRequest_Create]
    @PassengerId UNIQUEIDENTIFIER,
    @NumOfPeople INT,
    @PickupAt DATETIME2(3),
    @PickUpPointId INT,
    @DropOffPointId INT,
    @RideProfileId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Validate that user exists, is Passenger and verified
        IF NOT EXISTS (
            SELECT 1
            FROM [dbo].[User] AS U
            WHERE U.[UserId] = @PassengerId AND U.[Role] = 'P' AND U.[Verified] = 1
        )
        BEGIN
            ;THROW 50001, 'Invalid PassengerId: User does not exist, is not a Passenger, or is not verified.', 1;
            RETURN;
        END

        -- Validate pickup datetime is in the future
        IF @PickupAt <= SYSUTCDATETIME()
        BEGIN
            ;THROW 50004, 'PickupAt must be in the future.', 1;
            RETURN;
        END

        -- Validate Pickup and DropOff points
        IF NOT EXISTS (
            SELECT 1
            FROM [dbo].[ZonePoint] AS ZP
            WHERE ZP.[PointId] = @PickUpPointId
        ) OR NOT EXISTS (
            SELECT 1
            FROM [dbo].[ZonePoint] AS ZP
            WHERE ZP.[PointId] = @DropOffPointId
        )
        BEGIN
            ;THROW 50006, 'Invalid PickUpPointId or DropOffPointId: One or both points do not exist.', 1;
            RETURN;
        END

        -- Validate ride profile exists
        IF NOT EXISTS (
            SELECT 1
            FROM [dbo].[AllowedRideProfile] AS ARP
            WHERE ARP.[RideProfileId] = @RideProfileId
        )
        BEGIN
            ;THROW 50007, 'Invalid RideProfileId: Ride profile does not exist for the given Passenger.', 1;
            RETURN;
        END

        -- Validate service type and points - if NOT bridged route -> ensure pickup & dropoff at same zone
        DECLARE @ServiceType NVARCHAR(100);
        DECLARE @RideType NVARCHAR(100);
        SELECT @ServiceType = ST.Name, @RideType = RT.Name
        FROM [dbo].[AllowedRideProfile] ARP
        JOIN [dbo].[Servicetype] ST ON ARP.ServiceTypeId = ST.ServiceTypeId
        JOIN [dbo].[Ridetype] RT ON ARP.RideTypeId = RT.RideTypeId
        WHERE ARP.RideProfileId = @RideProfileId;

        IF @ServiceType <> 'bridged_route'
        BEGIN
            DECLARE @PickupZone INT, @DropoffZone INT;
            SELECT @PickupZone = ZoneId FROM [dbo].[ZonePoint] WHERE PointId = @PickUpPointId;
            SELECT @DropoffZone = ZoneId FROM [dbo].[ZonePoint] WHERE PointId = @DropOffPointId;
            IF @PickupZone <> @DropoffZone
            BEGIN
                ;THROW 50005, 'Pickup and dropoff must be in the same zone for this service type.', 1;
                RETURN;
            END
        END

        -- if ride type is renting vehicle -> Passenger.CanDrive must be 1
        IF @RideType = 'vehicle_no_driver'
        BEGIN
            DECLARE @CanDrive BIT;
            SELECT @CanDrive = P.CanDrive
            FROM [dbo].[Passenger] AS P
            WHERE P.[UserId] = @PassengerId;

            IF @CanDrive <> 1
            BEGIN
                ;THROW 50009, 'Passenger is not authorized to rent a vehicle without a driver.', 1;
                RETURN;
            END
        END

        -- Validate that NumOfPeople is within allowed limits
        DECLARE @VehicleSeats INT;
        SELECT @VehicleSeats = VT.[NumOfSeats]
        FROM [dbo].[AllowedRideProfile] AS ARP
        JOIN [dbo].[VehicleType] AS VT ON ARP.[VehicleTypeId] = VT.[VehicleTypeId]
        WHERE ARP.[RideProfileId] = @RideProfileId; 

        IF @NumOfPeople > @VehicleSeats
        BEGIN
            ;THROW 50008, 'Number of people exceeds the maximum allowed for the selected ride profile.', 1;
            RETURN;
        END 

        INSERT INTO [dbo].[RideRequest] (
            [PassengerId],
            [NumOfPeople],
            [PickupAt],
            [PickUpPoint],
            [DropOffPoint],
            [RideProfileId],
            [Status]
        )
        VALUES (
            @PassengerId,
            @NumOfPeople,
            @PickupAt,
            @PickUpPointId,
            @DropOffPointId,
            @RideProfileId,
            'Pending'
        );
        
        DECLARE @RequestId INT = SCOPE_IDENTITY();
        SELECT @RequestId AS RequestId;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO


-- =============================================
-- Update Ride Request
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[usp_RideRequest_Update]
    @RequestId INT,
    @NumOfPeople INT = NULL,
    @PickupAt DATETIME2(3) = NULL,
    @RideProfileId UNIQUEIDENTIFIER = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Check if request exists
        IF NOT EXISTS (SELECT 1 FROM [dbo].[RideRequest] WHERE [RequestId] = @RequestId)
        BEGIN
            ;THROW 50001, 'Ride request not found', 1;
        END

        DECLARE 
            @CurrentStatus      NVARCHAR(100),
            @CurrentRideProfile UNIQUEIDENTIFIER;

        SELECT 
            @CurrentStatus      = [Status],
            @CurrentRideProfile = [RideProfileId]
        FROM [dbo].[RideRequest]
        WHERE [RequestId] = @RequestId;

        -- Ride request cannot be updated if status is Accepted/Cancelled/Completed
        SELECT @CurrentStatus = [Status] 
        FROM [dbo].[RideRequest] 
        WHERE [RequestId] = @RequestId;
        
        IF @CurrentStatus NOT IN ('Pending', 'Edited')
        BEGIN
            ;THROW 50003, 'Ride request cannot be edited in its current status.', 1;
        END

        -- Validate ride profile, service type, and vehicle seats
        DECLARE 
            @EffectiveRideProfileId UNIQUEIDENTIFIER,
            @ServiceTypeName       NVARCHAR(100),
            @RideTypeName          NVARCHAR(100),
            @PickupPointId         INT,
            @DropOffPointId        INT,
            @PickupZone            INT,
            @DropoffZone           INT;

        SET @EffectiveRideProfileId = ISNULL(@RideProfileId, @CurrentRideProfile);

        -- Get current pickup/dropoff points for this request
        SELECT 
            @PickupPointId  = [PickUpPoint],
            @DropOffPointId = [DropOffPoint]
        FROM [dbo].[RideRequest]
        WHERE [RequestId] = @RequestId;

        -- Resolve service type from the selected ride profile
        SELECT 
            @ServiceTypeName = ST.[Name],
            @RideTypeName    = RT.[Name]
        FROM [dbo].[AllowedRideProfile] AS ARP
        JOIN [dbo].[Servicetype]       AS ST
            ON ARP.[ServiceTypeId] = ST.[ServiceTypeId]
        JOIN [dbo].[Ridetype]          AS RT
            ON ARP.[RideTypeId] = RT.[RideTypeId]
        WHERE ARP.[RideProfileId] = @EffectiveRideProfileId;

        IF @ServiceTypeName IS NULL
        BEGIN
            ;THROW 50004, 'Invalid ride profile supplied for update.', 1;
        END

        -- Get zones for pickup and dropoff points
        SELECT @PickupZone = ZP.[ZoneId]
        FROM [dbo].[ZonePoint] AS ZP
        WHERE ZP.[PointId] = @PickupPointId;

        SELECT @DropoffZone = ZP.[ZoneId]
        FROM [dbo].[ZonePoint] AS ZP
        WHERE ZP.[PointId] = @DropOffPointId;

        IF @PickupZone IS NULL OR @DropoffZone IS NULL
        BEGIN
            ;THROW 50012, 'Pickup or dropoff point is not assigned to a zone.', 1;
        END

        -- Business rules:
        -- 1) Same zone => cannot use bridged_route
        IF @PickupZone = @DropoffZone AND @ServiceTypeName = 'bridged_route'
        BEGIN
            ;THROW 50009, 'Bridged route service is only available for rides between different zones.', 1;
        END

        -- 2) Different zones => must use bridged_route
        IF @PickupZone <> @DropoffZone AND @ServiceTypeName <> 'bridged_route'
        BEGIN
            ;THROW 50005, 'For rides between different zones, service type must be bridged route.', 1;
        END

        -- 3) Ride type selected is vehicle_no_driver -> passenger must be eligible to drive
        DECLARE @PassengerCanDrive BIT;

        SELECT @PassengerCanDrive = P.CanDrive
        FROM RideRequest RR
        JOIN Passenger P ON RR.PassengerId = P.UserId
        WHERE RR.RequestId = @RequestId;

        IF @RideTypeName = 'vehicle_no_driver' AND ISNULL(@PassengerCanDrive, 0) = 0
        BEGIN
            ;THROW 50013, 'You must be eligible to drive to be able to select this service. Get verified in the Profile page.', 1;
        END;

        -- Vehicle seat validation
        IF @NumOfPeople IS NOT NULL
        BEGIN
            DECLARE @VehicleSeats INT;

            SELECT @VehicleSeats = VT.[NumOfSeats]
            FROM [dbo].[AllowedRideProfile] AS ARP
            JOIN [dbo].[VehicleType]       AS VT 
                ON ARP.[VehicleTypeId] = VT.[VehicleTypeId]
            WHERE ARP.[RideProfileId] = @EffectiveRideProfileId;

            IF @VehicleSeats IS NULL
            BEGIN
                ;THROW 50004, 'Invalid ride profile supplied for update.', 1;
            END

            IF @NumOfPeople > @VehicleSeats
            BEGIN
                DECLARE @ErrMsg NVARCHAR(200) = 'Number of people exceeds the maximum allowed for the selected ride profile. Maximum is ' + CAST(@VehicleSeats AS NVARCHAR(10)) + '.';
                ;THROW 50008, @ErrMsg, 1;
            END
        END

        -- Invalidate dispatch offers
        UPDATE dof
        SET 
            dof.Status = 'Expired',
            dof.RespondedAt = COALESCE(dof.RespondedAt, GETUTCDATE())
        FROM dbo.DispatchOffer AS dof
        INNER JOIN dbo.ItineraryLeg AS il ON dof.LegId = il.LegId
        WHERE il.RideRequestId = @RequestId
          AND dof.Status IN ('Sent', 'Accepted');
        
        -- Update only provided fields
        UPDATE [dbo].[RideRequest]
        SET
            [NumOfPeople]  = ISNULL(@NumOfPeople,  [NumOfPeople]),
            [PickupAt]     = ISNULL(@PickupAt,     [PickupAt]),
            [RideProfileId]= @EffectiveRideProfileId,
            [UpdatedAt]    = GETUTCDATE()
        WHERE [RequestId] = @RequestId;

        -- Send new dispatch offers
        
        SELECT * FROM [dbo].[RideRequest] WHERE [RequestId] = @RequestId;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO


-- =============================================
-- Cancel Ride Request
-- =============================================
CREATE OR ALTER PROCEDURE [dbo].[usp_RideRequest_Cancel]
    @RequestId   INT,
    @PassengerId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Check if request exists and belongs to passenger
        IF NOT EXISTS (
            SELECT 1 
            FROM [dbo].[RideRequest] 
            WHERE [RequestId] = @RequestId 
              AND [PassengerId] = @PassengerId
        )
        BEGIN
            ;THROW 50002, 'Ride request not found or unauthorized', 1;
        END;
        
        -- Check if request can be cancelled
        DECLARE @CurrentStatus NVARCHAR(100);
        SELECT @CurrentStatus = [Status] 
        FROM [dbo].[RideRequest] 
        WHERE [RequestId] = @RequestId;
        
        IF @CurrentStatus IN ('Accepted', 'Cancelled', 'Completed')
        BEGIN
            ;THROW 50003, 'Cannot cancel request', 1;
        END;
        
        -- Update ride request status to Cancelled
        UPDATE [dbo].[RideRequest]
        SET 
            [Status]    = 'Cancelled',
            [UpdatedAt] = GETUTCDATE()
        WHERE [RequestId] = @RequestId;

        ------------------------------------------------
        -- Expire all dispatch offers for this ride request
        ------------------------------------------------
        UPDATE dof
        SET 
            dof.Status      = 'Expired',
            dof.RespondedAt = COALESCE(dof.RespondedAt, GETUTCDATE())
        FROM dbo.DispatchOffer AS dof
        INNER JOIN dbo.ItineraryLeg AS il 
            ON dof.LegId = il.LegId
        WHERE il.RideRequestId = @RequestId
          AND dof.Status IN ('Sent', 'Accepted');

        ------------------------------------------------
        -- Mark RideRequestProgress as Failed 
        ------------------------------------------------
        UPDATE dbo.RideRequestProgress
        SET 
            Status    = 'Failed',
            UpdatedAt = GETUTCDATE()
        WHERE RequestId = @RequestId
          AND Status IN ('AwaitingDrivers', 'AllAccepted');

        COMMIT TRANSACTION;

        SELECT * 
        FROM [dbo].[RideRequest] 
        WHERE [RequestId] = @RequestId;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_UserServiceEnrollment_Enroll
(
    @UserId        UNIQUEIDENTIFIER,
    @VehicleId     UNIQUEIDENTIFIER,
    @ServiceTypeId INT,
    @RideTypeId    INT
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE 
        @UserRole       CHAR(1),
        @UserVerified   BIT,
        @VehicleTypeId  INT,
        @VehicleVerified BIT;

    -- 1. Validate user (must be Driver or Company Rep and verified)
    SELECT 
        @UserRole     = Role,
        @UserVerified = Verified
    FROM dbo.[User]
    WHERE UserId = @UserId;

    IF @UserRole IS NULL
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END;

    IF @UserRole NOT IN ('D','C')
    BEGIN
        RAISERROR('Only Drivers and Company Representatives can enroll in services.', 16, 1);
        RETURN;
    END;

    IF @UserVerified <> 1
    BEGIN
        RAISERROR('User must be verified before enrolling in a service.', 16, 1);
        RETURN;
    END;

    -- 2. Validate vehicle (exists, belongs to user, verified)
    SELECT 
        @VehicleTypeId   = VehicleTypeId,
        @VehicleVerified = Verified
    FROM dbo.Vehicle
    WHERE VehicleId = @VehicleId
      AND OwnerUserId = @UserId;  -- adjust if you later allow company-owned pools

    IF @VehicleTypeId IS NULL
    BEGIN
        RAISERROR('Vehicle not found for this user.', 16, 1);
        RETURN;
    END;

    IF @VehicleVerified <> 1
    BEGIN
        RAISERROR('Vehicle must be verified before enrolling in a service.', 16, 1);
        RETURN;
    END;

    -- 3. Validate combination in AllowedRideProfile
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.AllowedRideProfile arp
        WHERE arp.ServiceTypeId = @ServiceTypeId
          AND arp.RideTypeId    = @RideTypeId
          AND arp.VehicleTypeId = @VehicleTypeId
    )
    BEGIN
        RAISERROR('Selected ServiceType/RideType is not allowed for this vehicle type.', 16, 1);
        RETURN;
    END;

    -- 4. Prevent duplicate enrollment: One vehicle can only have ONE service enrollment
    IF EXISTS (
        SELECT 1
        FROM dbo.UserServiceEnrollment use2
        WHERE use2.UserId     = @UserId
          AND use2.VehicleId  = @VehicleId
          AND use2.Status IN ('Pending','Approved')
    )
    BEGIN
        RAISERROR('This vehicle is already enrolled in a service. Each vehicle can only be enrolled in one service at a time.', 16, 1);
        RETURN;
    END;

    -- 5. Insert enrollment as Pending
    INSERT INTO dbo.UserServiceEnrollment (UserId, VehicleId, ServiceType, RideType, Status)
    VALUES (@UserId, @VehicleId, @ServiceTypeId, @RideTypeId, 'Pending');

    DECLARE @EnrollId INT = SCOPE_IDENTITY();

    SELECT @EnrollId AS EnrollId;
END;

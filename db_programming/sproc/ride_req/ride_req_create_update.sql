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
            ;THROW 50005, 'Invalid PickUpPointId or DropOffPointId: One or both points do not exist.', 1;
            RETURN;
        END

        -- Validate ride profile exists
        IF NOT EXISTS (
            SELECT 1
            FROM [dbo].[AllowedRideProfile] AS ARP
            WHERE ARP.[RideProfileId] = @RideProfileId
        )
        BEGIN
            ;THROW 50002, 'Invalid RideProfileId: Ride profile does not exist for the given Passenger.', 1;
            RETURN;
        END

        -- Validate that NumOfPeople is within allowed limits
        DECLARE @VehicleSeats INT;
        SELECT @VehicleSeats = VT.[NumOfSeats]
        FROM [dbo].[AllowedRideProfile] AS ARP
        JOIN [dbo].[VehicleType] AS VT ON ARP.[VehicleTypeId] = VT.[VehicleTypeId]
        WHERE ARP.[RideProfileId] = @RideProfileId; 

        IF @NumOfPeople > @VehicleSeats
        BEGIN
            ;THROW 50003, 'Number of people exceeds the maximum allowed for the selected ride profile.', 1;
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
    @PickUpPointId INT = NULL,
    @DropOffPointId INT = NULL,
    @Status NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Check if request exists
        IF NOT EXISTS (SELECT 1 FROM [dbo].[RideRequest] WHERE [RequestId] = @RequestId)
        BEGIN
            ;THROW 50001, 'Ride request not found', 1;
        END
        
        DECLARE @RideProfileId UNIQUEIDENTIFIER;
        SELECT @RideProfileId = [RideProfileId]
        FROM [dbo].[RideRequest]
        WHERE [RequestId] = @RequestId;

        IF @NumOfPeople IS NOT NULL
        BEGIN
            -- Validate that NumOfPeople is within allowed limits
            DECLARE @VehicleSeats INT;
            SELECT @VehicleSeats = VT.[NumOfSeats]
            FROM [dbo].[AllowedRideProfile] AS ARP
            JOIN [dbo].[VehicleType] AS VT ON ARP.[VehicleTypeId] = VT.[VehicleTypeId]
            WHERE ARP.[RideProfileId] = @RideProfileId; 

            IF @NumOfPeople > @VehicleSeats
            BEGIN
                ;THROW 50003, 'Number of people exceeds the maximum allowed for the selected ride profile.', 1;
                RETURN;
            END 
        END

        -- Check status value
        IF @Status IS NOT NULL AND @Status NOT IN ('Pending', 'Accepted', 'Completed', 'Cancelled')
        BEGIN
            ;THROW 50002, 'Invalid status value', 1;
        END
        
        -- Update only provided fields
        UPDATE [dbo].[RideRequest]
        SET 
            [NumOfPeople] = ISNULL(@NumOfPeople, [NumOfPeople]),
            [PickupAt] = ISNULL(@PickupAt, [PickupAt]),
            [PickUpPoint] = ISNULL(@PickUpPointId, [PickUpPoint]),
            [DropOffPoint] = ISNULL(@DropOffPointId, [DropOffPoint]),
            [Status] = ISNULL(@Status, [Status]),
            [UpdatedAt] = GETUTCDATE()
        WHERE [RequestId] = @RequestId;
        
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
    @RequestId INT,
    @PassengerId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;
    
    BEGIN TRY
        -- Check if request exists and belongs to passenger
        IF NOT EXISTS (
            SELECT 1 FROM [dbo].[RideRequest] 
            WHERE [RequestId] = @RequestId 
            AND [PassengerId] = @PassengerId
        )
        BEGIN
            ;THROW 50002, 'Ride request not found or unauthorized', 1;
        END
        
        -- Check if request can be cancelled
        DECLARE @CurrentStatus NVARCHAR(100);
        SELECT @CurrentStatus = [Status] 
        FROM [dbo].[RideRequest] 
        WHERE [RequestId] = @RequestId;
        
        IF @CurrentStatus IN ('Cancelled', 'Completed')
        BEGIN
            ;THROW 50003, 'Cannot cancel a completed or already cancelled request', 1;
        END
        
        -- Update ride req status to Cancelled
        UPDATE [dbo].[RideRequest]
        SET 
            [Status] = 'Cancelled',
            [UpdatedAt] = GETUTCDATE()
        WHERE [RequestId] = @RequestId;

        -- Expire all dispatch offers for this ride request
        UPDATE dof
        SET dof.Status = 'Expired', dof.RespondedAt = GETUTCDATE()
        FROM dbo.DispatchOffer dof
        INNER JOIN dbo.ItineraryLeg il ON dof.LegId = il.LegId
        WHERE il.RideRequestId = @RequestId
        AND dof.Status IN ('Sent', 'Accepted');

        -- Mark RideRequestProgress as Failed
        UPDATE dbo.RideRequestProgress
        SET Status = 'Failed', UpdatedAt = GETUTCDATE()
        WHERE RequestId = @RequestId;

        SELECT * FROM [dbo].[RideRequest] WHERE [RequestId] = @RequestId;
    END TRY
    BEGIN CATCH
        THROW;
    END CATCH
END
GO
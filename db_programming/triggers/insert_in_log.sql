-- =============================================
-- Trigger: Log Ride Request Changes
-- =============================================
CREATE OR ALTER TRIGGER [dbo].[trg_RideRequest_Log]
ON [dbo].[RideRequest]
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @Operation CHAR(1);
    
    -- Determine operation type
    IF EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted)
        SET @Operation = 'U'; -- Update
    ELSE IF EXISTS (SELECT * FROM inserted)
        SET @Operation = 'I'; -- Insert
    ELSE
        SET @Operation = 'D'; -- Delete
    
    -- Log INSERT operations
    IF @Operation = 'I'
    BEGIN
        INSERT INTO [dbo].[RideRequestLog] (
            [RequestId], [Operation],
            [PassengerId], [NumOfPeople], [PickupAt], 
            [PickUpPoint], [DropOffPoint], [CreatedAt], 
            [UpdatedAt], [Status], [RideProfileId]
        )
        SELECT 
            [RequestId], @Operation,
            [PassengerId], [NumOfPeople], [PickupAt],
            [PickUpPoint], [DropOffPoint], [CreatedAt],
            [UpdatedAt], [Status], [RideProfileId]
        FROM inserted;
    END
    
    -- Log UPDATE operations
    IF @Operation = 'U'
    BEGIN
        INSERT INTO [dbo].[RideRequestLog] (
            [RequestId], [Operation],
            [PassengerId], [NumOfPeople], [PickupAt], 
            [PickUpPoint], [DropOffPoint], [CreatedAt], 
            [UpdatedAt], [Status], [RideProfileId]
        )
        SELECT 
            [RequestId], @Operation,
            [PassengerId], [NumOfPeople], [PickupAt],
            [PickUpPoint], [DropOffPoint], [CreatedAt],
            [UpdatedAt], [Status], [RideProfileId]
        FROM inserted;
    END
    
    -- Log DELETE operations
    IF @Operation = 'D'
    BEGIN
        INSERT INTO [dbo].[RideRequestLog] (
            [RequestId], [Operation],
            [PassengerId], [NumOfPeople], [PickupAt], 
            [PickUpPoint], [DropOffPoint], [CreatedAt], 
            [UpdatedAt], [Status], [RideProfileId]
        )
        SELECT 
            [RequestId], @Operation,
            [PassengerId], [NumOfPeople], [PickupAt],
            [PickUpPoint], [DropOffPoint], [CreatedAt],
            [UpdatedAt], [Status], [RideProfileId]
        FROM deleted;
    END
END
GO
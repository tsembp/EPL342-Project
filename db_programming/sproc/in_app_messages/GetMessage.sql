CREATE OR ALTER PROCEDURE [dbo].[usp_GetMessage]
    @RideId INT,
    @UserId UNIQUEIDENTIFIER
AS
BEGIN
    SET NOCOUNT ON;

    IF @RideId IS NULL OR @UserId IS NULL
    BEGIN
        RAISERROR('[RideId] and [UserId] are required.', 16, 1);
        RETURN;
    END;

    DECLARE
        @RideExists       BIT = 0,
        @DriverUserId     UNIQUEIDENTIFIER,
        @PassengerUserId  UNIQUEIDENTIFIER;

    SELECT
        @RideExists       = 1,
        @DriverUserId     = [R].[DriverUserId],
        @PassengerUserId  = [R].[PassengerUserId]
    FROM [dbo].[Ride] AS [R]
    WHERE [R].[RideId] = @RideId;

    IF @RideExists = 0
    BEGIN
        RAISERROR('Ride not found.', 16, 1);
        RETURN;
    END;

    IF @UserId NOT IN (@DriverUserId, @PassengerUserId)
    BEGIN
        RAISERROR('User is not a participant in this ride.', 16, 1);
        RETURN;
    END;

    -- Return all messages for this ride
    SELECT
        [M].[MsgId],
        [M].[Ride],
        [M].[SenderUserId],
        [M].[RecipientUserId],
        [M].[Body],
        [M].[SentAt]
    FROM [dbo].[InAppMessage] AS [M]
    WHERE [M].[Ride] = @RideId
    ORDER BY [M].[SentAt] ASC, [M].[MsgId] ASC;
END;
GO

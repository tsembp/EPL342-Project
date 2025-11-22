CREATE OR ALTER PROCEDURE [dbo].[usp_SendMessage]
    @SenderUserId    UNIQUEIDENTIFIER,
    @RecipientUserId UNIQUEIDENTIFIER,
    @RideId          INT,
    @Body            NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    -- Basic validation
    IF @SenderUserId IS NULL
       OR @RecipientUserId IS NULL
       OR @RideId IS NULL
       OR @Body IS NULL
       OR LTRIM(RTRIM(@Body)) = N''
    BEGIN
        RAISERROR('All parameters are required and [Body] cannot be empty.', 16, 1);
        RETURN;
    END;

    IF @SenderUserId = @RecipientUserId
    BEGIN
        RAISERROR('Sender and recipient must be different users.', 16, 1);
        RETURN;
    END;

    -- Load ride and participants
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

    -- Check that both users are participants in this ride
    IF @SenderUserId NOT IN (@DriverUserId, @PassengerUserId)
       OR @RecipientUserId NOT IN (@DriverUserId, @PassengerUserId)
    BEGIN
        RAISERROR('Both sender and recipient must be participants in the ride.', 16, 1);
        RETURN;
    END;

    -- Insert the message
    INSERT INTO [dbo].[InAppMessage](
        [SenderUserId],
        [RecipientUserId],
        [Body],
        [Ride]
    )
    VALUES(
        @SenderUserId,
        @RecipientUserId,
        @Body,
        @RideId
    );

    
    -- Return the inserted row
    SELECT
        [M].[MsgId],
        [M].[Ride],
        [M].[SenderUserId],
        [M].[RecipientUserId],
        [M].[Body],
        [M].[SentAt]
    FROM [dbo].[InAppMessage] AS [M]
    WHERE [M].[MsgId] = SCOPE_IDENTITY();
END;
GO

CREATE OR ALTER PROCEDURE [dbo].[usp_CreateRating]
    @RideID INT,
    @AuthorUserID UNIQUEIDENTIFIER,
    @TargetUserID UNIQUEIDENTIFIER,
    @Stars INT,
    @Comment NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- Validations
    IF (@Stars < 1 OR @Stars > 5)
    BEGIN
        ;THROW 51000, 'Stars must be between 1 and 5.', 1;
    END;

    IF (@AuthorUserId = @TargetUserId)
    BEGIN
        ;THROW 51001, 'Author cannot rate themselves.', 1;
    END;

    -- Load Ride inforamtion
    DECLARE 
        @DriverUserID UNIQUEIDENTIFIER,
        @PassengerUserID UNIQUEIDENTIFIER,
        @RideStatus NVARCHAR(50);

    IF NOT EXISTS(
        SELECT 1
        FROM dbo.Ride R
        WHERE R.RideID = @RideID
    )
    BEGIN
        ;THROW 51002, 'Ride does not exist.', 1;
    END;

    -- Get ride details
    SELECT 
        @DriverUserID = R.DriverUserID,
        @PassengerUserID = R.PassengerUserID,
        @RideStatus = R.Status
    FROM dbo.Ride R
    WHERE R.RideID = @RideID;

    -- Ride must be completed
    IF (@RideStatus <> 'Completed')
    BEGIN
        ;THROW 51003, 'Ride must be completed before creating ratings.', 1;
    END;

    -- 4. Author must be a passenger or a driver
    IF (@AuthorUserId NOT IN (@DriverUserId, @PassengerUserId))
    BEGIN
        ;THROW 51004, 'Author did not participate in this ride.', 1;
    END;

    -- 5. Target must be the other participant of the ride
    IF (@TargetUserId NOT IN (@DriverUserId, @PassengerUserId)
            OR @TargetUserId = @AuthorUserId)
    BEGIN
        ;THROW 51005, 'Target user must be the other participant of the ride.', 1;
    END;

    -- Only one rating from Author -> Target per ride
    IF EXISTS (
        SELECT 1
        FROM dbo.Rating AS RT
        WHERE RT.RideId = @RideId AND RT.AuthorUserId = @AuthorUserId AND RT.TargetUserId = @TargetUserId
    )
    BEGIN
        ;THROW 51006, 'A rating already exists for this ride and user pair.', 1;


    END;

    -- Insert the new rating
    INSERT INTO dbo.Rating (RideId, AuthorUserId, TargetUserId, Stars, Comment)
    VALUES (@RideId, @AuthorUserId, @TargetUserId, @Stars, @Comment);
    DECLARE @NewRatingId INT = SCOPE_IDENTITY();
    SELECT @NewRatingId AS RatingId;
END;
GO
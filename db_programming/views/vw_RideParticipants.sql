CREATE VIEW dbo.vw_RideParticipants AS
SELECT 
    R.RideId,
    R.PassengerUserId AS PassengerUserId,
    R.DriverUserId AS DriverUserId
FROM dbo.Ride R
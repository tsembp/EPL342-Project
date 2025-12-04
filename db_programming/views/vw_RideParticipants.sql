-- =============================================
IF OBJECT_ID('dbo.vw_RideParticipants', 'V') IS NOT NULL
    DROP VIEW dbo.vw_RideParticipants;
GO

CREATE VIEW dbo.vw_RideParticipants AS
SELECT 
    R.RideId,
    R.PassengerUserId AS PassengerUserId,
    R.DriverUserId AS DriverUserId
FROM dbo.Ride R
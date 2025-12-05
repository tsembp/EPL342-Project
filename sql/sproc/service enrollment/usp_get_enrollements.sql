CREATE OR ALTER PROCEDURE dbo.usp_GetServiceEnrollmentsForReview
(
    @OperatorId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    -- You can use @OperatorId later for per-operator filtering/logging if you want.
    SELECT 
        SE.EnrollId,
        SE.Status,
        CONCAT(D.FirstName, ' ', D.LastName) AS DriverName,
        V.PlateNumber  AS VehiclePlate,
        ST.Name        AS ServiceTypeName,
        RT.Name        AS RideTypeName
    FROM dbo.UserServiceEnrollment AS SE
    JOIN dbo.[User]        AS D  ON SE.UserId   = D.UserId
    JOIN dbo.Vehicle       AS V  ON SE.VehicleId      = V.VehicleId
    JOIN dbo.ServiceType   AS ST ON SE.ServiceType  = ST.ServiceTypeId
    JOIN dbo.RideType      AS RT ON SE.RideType     = RT.RideTypeId;
END;
GO

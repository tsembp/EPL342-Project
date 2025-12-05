CREATE OR ALTER PROCEDURE dbo.usp_GetServiceEnrollmentsForDriver
(
    @DriverUserId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        SE.EnrollId,
        SE.Status,
        V.PlateNumber      AS VehiclePlate,
        ST.ServiceTypeId,
        ST.Name            AS ServiceTypeName,
        RT.RideTypeId,
        RT.Name            AS RideTypeName
    FROM dbo.UserServiceEnrollment AS SE
    INNER JOIN dbo.Vehicle      AS V  ON SE.VehicleId   = V.VehicleId
    INNER JOIN dbo.ServiceType  AS ST ON SE.ServiceType = ST.ServiceTypeId
    INNER JOIN dbo.RideType     AS RT ON SE.RideType    = RT.RideTypeId
    WHERE SE.UserId = @DriverUserId
    ORDER BY
        CASE SE.Status
            WHEN 'Pending'  THEN 1
            WHEN 'Approved' THEN 2
            ELSE 3
        END,
        ST.Name,
        V.PlateNumber;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_GetActiveServiceTypesForDriver
(
    @UserId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ST.ServiceTypeId,
        ST.Name,
        ST.Description,
        ST.BaseFare
    FROM dbo.ServiceType AS ST
    WHERE ST.Active = 1
      AND (ST.ValidFrom IS NULL OR ST.ValidFrom <= SYSUTCDATETIME())
      AND (ST.ValidTo   IS NULL OR ST.ValidTo   >  SYSUTCDATETIME());
END;
GO

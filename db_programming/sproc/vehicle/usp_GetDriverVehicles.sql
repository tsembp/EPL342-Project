CREATE OR ALTER PROCEDURE dbo.usp_GetDriverVehicles
(
    @UserId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        V.VehicleId,
        V.PlateNumber,
        V.Brand,
        V.Model,
        V.Color,
        V.Seats,
        V.CargoVolume,
        V.CargoWeight,
        V.Status AS VehicleStatus, -- e.g., 'Pending', 'Active', 'Inactive'
        VT.Type AS VehicleType,
        CASE
            WHEN
                (SELECT COUNT(DISTINCT VD.DocType)
                 FROM dbo.VehicleDocument VD
                 WHERE VD.VehicleId = V.VehicleId
                   AND VD.Status = 'Accepted'
                   AND VD.DocType IN ('VEHICLE_REGISTRATION', 'MOT_CERTIFICATE', 'VEHICLE_CLASSIFICATION_CERTIFICATE', 'VEHICLE_IMAGE')) = 4 -- All required docs
            THEN CAST(1 AS BIT)
            ELSE CAST(0 AS BIT)
        END AS IsApproved
    FROM
        dbo.Vehicle V
    INNER JOIN
        dbo.VehicleType VT ON V.VehicleTypeId = VT.VehicleTypeId
    WHERE
        V.OwnerUserId = @UserId;
END;

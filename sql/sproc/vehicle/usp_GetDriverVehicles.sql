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
        VT.Name AS VehicleType,    -- <- changed from VT.Type to VT.Name
        CASE
            WHEN
                (SELECT COUNT(DISTINCT VD.DocType)
                 FROM dbo.VehicleDocument VD
                 WHERE VD.VehicleId = V.VehicleId
                   AND VD.Status = 'Accepted'
                   AND VD.DocType IN (
                       'VEHICLE_REGISTRATION',
                       'MOT_CERTIFICATE',
                       'VEHICLE_CLASSIFICATION_CERTIFICATE',
                       'VEHICLE_IMAGE_INTERIOR',
                       'VEHICLE_IMAGE_EXTERIOR'
                   )
                ) = 5 -- All required docs
            THEN CAST(1 AS BIT)
            ELSE CAST(0 AS BIT)
        END AS IsApproved,
        CASE
            WHEN
                (SELECT COUNT(DISTINCT RequiredDoc.DocType)
                 FROM (VALUES
                    ('VEHICLE_REGISTRATION'),
                    ('MOT_CERTIFICATE'),
                    ('VEHICLE_CLASSIFICATION_CERTIFICATE'),
                    ('VEHICLE_IMAGE_INTERIOR'),
                    ('VEHICLE_IMAGE_EXTERIOR')
                 ) AS RequiredDoc(DocType)
                 WHERE EXISTS (
                    SELECT 1
                    FROM dbo.VehicleDocument VD
                    WHERE VD.VehicleId = V.VehicleId
                      AND VD.DocType = RequiredDoc.DocType
                 )
                ) = 5 -- All required doc types have at least one submission
            THEN CAST(1 AS BIT)
            ELSE CAST(0 AS BIT)
        END AS HasAllRequiredDocsSubmitted
    FROM dbo.Vehicle V
    INNER JOIN dbo.VehicleType VT
        ON V.VehicleTypeId = VT.VehicleTypeId
    WHERE V.OwnerUserId = @UserId;
END;

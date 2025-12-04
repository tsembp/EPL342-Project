CREATE OR ALTER PROCEDURE dbo.usp_Operator_GetVehiclesOverview
(
    @OperatorId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate operator (must exist and be verified)
    IF NOT EXISTS (
        SELECT 1
        FROM [dbo].[Operator] O
        WHERE O.OperatorId = @OperatorId
          AND O.Verified = 1
    )
    BEGIN
        RAISERROR('Invalid or unverified operator.', 16, 1);
        RETURN;
    END;

    ;WITH LatestDocs AS (
        SELECT
            VD.VehicleId,
            VD.DocType,
            VD.ExpiryDate,
            VD.Status,
            VD.UploadedAt,
            ROW_NUMBER() OVER (
                PARTITION BY VD.VehicleId, VD.DocType
                ORDER BY VD.UploadedAt DESC, VD.VehDocId DESC
            ) AS rn
        FROM dbo.VehicleDocument VD
    ),
    RequiredDocs AS (
        SELECT
            d.VehicleId,
            COUNT(DISTINCT CASE
                WHEN d.DocType IN (
                    'VEHICLE_REGISTRATION',
                    'MOT_CERTIFICATE',
                    'VEHICLE_CLASSIFICATION_CERTIFICATE',
                    'VEHICLE_IMAGE'
                )
                AND d.Status = 'Accepted'
                AND (d.ExpiryDate IS NULL OR d.ExpiryDate > SYSUTCDATETIME())
                THEN d.DocType
            END) AS ApprovedRequiredDocCount,
            MIN(CASE
                WHEN d.DocType IN (
                    'VEHICLE_REGISTRATION',
                    'MOT_CERTIFICATE',
                    'VEHICLE_CLASSIFICATION_CERTIFICATE'
                )
                THEN d.ExpiryDate
            END) AS MinRequiredExpiry
        FROM LatestDocs d
        WHERE d.rn = 1
        GROUP BY d.VehicleId
    )

    SELECT
        V.VehicleId,
        V.PlateNumber,
        V.VehicleTypeId,
        V.Seats,
        V.CargoVolume,
        V.Status,
        V.Verified,
        OwnerName = CONCAT(U.FirstName, ' ', U.LastName),

        -- document aggregation
        COALESCE(RD.ApprovedRequiredDocCount, 0) AS ApprovedRequiredDocCount,
        RD.MinRequiredExpiry,
        MOTExpiry = MOT.ExpiryDate,

        -- high-level vehicle status for UI tabs
        VehicleStatus =
            CASE
                WHEN V.Verified = 1 AND V.Status = 'Active' THEN 'verified'
                WHEN V.Verified = 0 AND EXISTS (
                    SELECT 1
                    FROM dbo.VehicleDocument VD
                    WHERE VD.VehicleId = V.VehicleId
                      AND VD.Status = 'Rejected'
                ) THEN 'rejected'
                ELSE 'pending'
            END,

        DocsStatus =
            CASE
                WHEN RD.MinRequiredExpiry IS NULL THEN 'ok' -- no expiry tracked; treat as ok
                WHEN RD.MinRequiredExpiry < CAST(SYSUTCDATETIME() AS DATE) THEN 'expired'
                WHEN RD.MinRequiredExpiry < DATEADD(DAY, 30, CAST(SYSUTCDATETIME() AS DATE)) THEN 'expiring'
                ELSE 'ok'
            END,

        -- placeholder; wire to your real enrollment table later if you want
        EnrollmentCount = 0
    FROM dbo.Vehicle V
    INNER JOIN dbo.[User] U
        ON U.UserId = V.OwnerUserId
    LEFT JOIN RequiredDocs RD
        ON RD.VehicleId = V.VehicleId
    LEFT JOIN LatestDocs MOT
        ON MOT.VehicleId = V.VehicleId
       AND MOT.DocType = 'MOT_CERTIFICATE'
       AND MOT.rn = 1
    ORDER BY V.PlateNumber;
END;
GO

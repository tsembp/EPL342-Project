IF OBJECT_ID('dbo.vw_VehicleTestDetails', 'V') IS NOT NULL
    DROP VIEW dbo.vw_VehicleTestDetails;
GO

CREATE VIEW dbo.vw_VehicleTestDetails AS
SELECT
    VT.TestId,
    VT.VehicleId,
    VT.InspectorId,
    VT.CheckDate,
    VT.ExpiryDate,
    VT.Comments,
    V.PlateNumber,
    V.Brand,
    V.Model,
    V.Color
FROM dbo.VehicleTest AS VT
INNER JOIN dbo.Vehicle AS V
    ON V.VehicleId = VT.VehicleId;
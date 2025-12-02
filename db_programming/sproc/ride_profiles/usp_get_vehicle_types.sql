-- =============================================
-- Stored Procedure: usp_GetVehicleTypes
-- Description: Returns all vehicle types
-- =============================================
CREATE OR ALTER PROCEDURE dbo.usp_GetVehicleTypes
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        VehicleTypeId,
        Name,
        NumOfSeats,
        MinCargoVolume,
        MinCargoWeight
    FROM dbo.VehicleType
    ORDER BY Name;
END;
GO

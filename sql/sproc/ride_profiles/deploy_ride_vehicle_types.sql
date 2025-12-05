-- Deploy the new stored procedures for getting ride types and vehicle types
-- Run this file against your database

-- =============================================
-- Stored Procedure: usp_GetRideTypes
-- =============================================
CREATE OR ALTER PROCEDURE dbo.usp_GetRideTypes
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        RideTypeId,
        Name,
        Description
    FROM dbo.RideType
    ORDER BY Name;
END;
GO

-- =============================================
-- Stored Procedure: usp_GetVehicleTypes
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

PRINT 'Stored procedures usp_GetRideTypes and usp_GetVehicleTypes created successfully.';

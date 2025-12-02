-- =============================================
-- Stored Procedure: usp_GetRideTypes
-- Description: Returns all ride types
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

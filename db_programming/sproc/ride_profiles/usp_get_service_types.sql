CREATE OR ALTER PROCEDURE dbo.usp_GetServiceTypes
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        ST.ServiceTypeId,
        ST.Name,
        ST.[Description],
        ST.BaseFare,
        ST.PerKm,
        ST.PerMin,
        ST.ValidFrom,
        ST.ValidTo,
        ST.Active
    FROM dbo.ServiceType AS ST
    ORDER BY ST.Name;
END;
GO

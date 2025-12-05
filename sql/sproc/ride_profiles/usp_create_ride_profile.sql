CREATE OR ALTER PROCEDURE dbo.usp_Operator_CreateAllowedRideProfile
    @ServiceTypeId INT,
    @RideTypeId    INT,
    @VehicleTypeId INT,
    @ProfileName   NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @New TABLE (RideProfileId UNIQUEIDENTIFIER);

    INSERT INTO dbo.AllowedRideProfile (
        ServiceTypeId,
        RideTypeId,
        VehicleTypeId,
        ProfileName
    )
    OUTPUT INSERTED.RideProfileId INTO @New (RideProfileId)
    VALUES (
        @ServiceTypeId,
        @RideTypeId,
        @VehicleTypeId,
        @ProfileName
    );

    SELECT
        ARP.RideProfileId,
        ARP.ServiceTypeId,
        ST.Name AS ServiceTypeName,
        ARP.RideTypeId,
        RT.Name AS RideTypeName,
        ARP.VehicleTypeId,
        VT.Name AS VehicleTypeName,
        ARP.ProfileName
    FROM dbo.AllowedRideProfile AS ARP
    JOIN dbo.ServiceType AS ST ON ST.ServiceTypeId = ARP.ServiceTypeId
    JOIN dbo.RideType    AS RT ON RT.RideTypeId    = ARP.RideTypeId
    JOIN dbo.VehicleType AS VT ON VT.VehicleTypeId = ARP.VehicleTypeId
    WHERE ARP.RideProfileId = (SELECT TOP 1 RideProfileId FROM @New);
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Operator_UpdateAllowedRideProfile
    @RideProfileId UNIQUEIDENTIFIER,
    @ServiceTypeId INT,
    @RideTypeId    INT,
    @VehicleTypeId INT,
    @ProfileName   NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.AllowedRideProfile
    SET
        ServiceTypeId = @ServiceTypeId,
        RideTypeId    = @RideTypeId,
        VehicleTypeId = @VehicleTypeId,
        ProfileName   = @ProfileName
    WHERE RideProfileId = @RideProfileId;

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
    WHERE ARP.RideProfileId = @RideProfileId;
END;
GO

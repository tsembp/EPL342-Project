IF OBJECT_ID('dbo.usp_Inspector_SearchVehiclesByPlate', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Inspector_SearchVehiclesByPlate;
GO

CREATE PROCEDURE dbo.usp_Inspector_SearchVehiclesByPlate
(
    @Plate NVARCHAR(50)
)
AS
BEGIN
    SET NOCOUNT ON;

    SET @Plate = ISNULL(@Plate, N'');

    -- Return up to 20 matching vehicles
    SELECT TOP (20)
        V.VehicleId,
        V.PlateNumber,
        V.Brand,
        V.Model,
        V.Color
    FROM dbo.Vehicle AS V
    WHERE V.PlateNumber LIKE N'%' + @Plate + N'%'
      AND V.Status IN ('Active', 'Pending')
    ORDER BY V.PlateNumber;
END;
GO


IF OBJECT_ID('dbo.usp_Inspector_GetVehicleTestsPaged', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Inspector_GetVehicleTestsPaged;
GO

CREATE PROCEDURE dbo.usp_Inspector_GetVehicleTestsPaged
(
    @Page      INT,
    @PageSize  INT,
    @VehicleId UNIQUEIDENTIFIER = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    IF @Page IS NULL OR @Page < 1 SET @Page = 1;
    IF @PageSize IS NULL OR @PageSize < 1 SET @PageSize = 10;

    DECLARE @Offset INT = (@Page - 1) * @PageSize;

    ;WITH Base AS
    (
        SELECT
            VT.TestId,
            VT.VehicleId,
            VT.InspectorId,
            VT.CheckDate,
            VT.ExpiryDate,
            VT.Comments,
            VT.PlateNumber,
            VT.Brand,
            VT.Model,
            VT.Color,
            TotalCount = COUNT(*) OVER ()
        FROM dbo.vw_VehicleTestDetails AS VT
        WHERE (@VehicleId IS NULL OR VT.VehicleId = @VehicleId)
    )
    SELECT
        TestId,
        VehicleId,
        InspectorId,
        CheckDate,
        ExpiryDate,
        Comments,
        PlateNumber,
        Brand,
        Model,
        Color,
        TotalCount
    FROM Base
    ORDER BY CheckDate DESC
    OFFSET @Offset ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END;
GO


IF OBJECT_ID('dbo.usp_Inspector_CreateVehicleTest', 'P') IS NOT NULL
    DROP PROCEDURE dbo.usp_Inspector_CreateVehicleTest;
GO

CREATE PROCEDURE dbo.usp_Inspector_CreateVehicleTest
(
    @InspectorId UNIQUEIDENTIFIER,
    @VehicleId   UNIQUEIDENTIFIER,
    @Comments    NVARCHAR(MAX) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    -- Validate vehicle
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Vehicle AS V
        WHERE V.VehicleId = @VehicleId
    )
    BEGIN
        RAISERROR('Vehicle does not exist.', 16, 1);
        RETURN;
    END;

    DECLARE @NewTestId UNIQUEIDENTIFIER;
    SET @NewTestId = NEWID();

    INSERT INTO dbo.VehicleTest
    (
        TestId,
        VehicleId,
        InspectorId,
        CheckDate,
        Comments
    )
    VALUES
    (
        @NewTestId,
        @VehicleId,
        @InspectorId,
        DEFAULT,
        COALESCE(@Comments, N'No comments')
    );

    -- Return the created test with vehicle info
    SELECT
        TestId,
        VehicleId,
        InspectorId,
        CheckDate,
        ExpiryDate,
        Comments,
        PlateNumber,
        Brand,
        Model,
        Color
    FROM dbo.vw_VehicleTestDetails
    WHERE TestId = @NewTestId;
END;
GO

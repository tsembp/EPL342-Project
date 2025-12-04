CREATE OR ALTER PROCEDURE dbo.usp_Operator_CreateServiceType
    @Name        NVARCHAR(100),
    @Description NVARCHAR(MAX),
    @BaseFare    MoneyAmount,
    @ValidFrom   UtcStamp = NULL,
    @ValidTo     UtcStamp = NULL,
    @Active      BIT = 1
AS
BEGIN
    SET NOCOUNT ON;

    IF @ValidFrom IS NULL
        SET @ValidFrom = GETUTCDATE();

    INSERT INTO dbo.ServiceType (
        Name,
        [Description],
        BaseFare,
        ValidFrom,
        ValidTo,
        Active
    )
    VALUES (
        @Name,
        @Description,
        @BaseFare,
        @ValidFrom,
        @ValidTo,
        @Active
    );

    SELECT
        ST.ServiceTypeId,
        ST.Name,
        ST.[Description],
        ST.BaseFare,
        ST.ValidFrom,
        ST.ValidTo,
        ST.Active
    FROM dbo.ServiceType AS ST
    WHERE ST.ServiceTypeId = SCOPE_IDENTITY();
END;
GO

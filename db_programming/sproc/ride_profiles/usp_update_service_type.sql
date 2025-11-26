CREATE OR ALTER PROCEDURE dbo.usp_Operator_UpdateServiceType
    @ServiceTypeId INT,
    @Name          NVARCHAR(100),
    @Description   NVARCHAR(MAX),
    @BaseFare      MoneyAmount,
    @PerKm         MoneyAmount,
    @PerMin        MoneyAmount,
    @Active        BIT
AS
BEGIN
    SET NOCOUNT ON;

    IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''
    BEGIN
        RAISERROR('Name cannot be empty.', 16, 1);
        RETURN;
    END;

    IF @Description IS NULL
    BEGIN
        RAISERROR('Description cannot be null.', 16, 1);
        RETURN;
    END;

    UPDATE dbo.ServiceType
    SET 
        Name        = @Name,
        [Description] = @Description,
        BaseFare    = @BaseFare,
        PerKm       = @PerKm,
        PerMin      = @PerMin,
        Active      = @Active,
        UpdatedAt   = GETUTCDATE()
    WHERE ServiceTypeId = @ServiceTypeId;

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
    WHERE ST.ServiceTypeId = @ServiceTypeId;
END;
GO

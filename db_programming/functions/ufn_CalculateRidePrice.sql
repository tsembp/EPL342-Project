-- =============================================
-- Function: ufn_CalculateRidePrice
-- Description: Calculate dynamic ride price with surge multiplier
-- Parameters:
--   @RideId: The ride to calculate price for
-- Returns: Final price as DECIMAL(12,2)
-- =============================================
IF OBJECT_ID('dbo.ufn_CalculateRidePrice', 'FN') IS NOT NULL
    DROP FUNCTION dbo.ufn_CalculateRidePrice;
GO

CREATE FUNCTION dbo.ufn_CalculateRidePrice
(
    @RideId INT
)
RETURNS DECIMAL(12,2)
AS
BEGIN
    DECLARE @FinalPrice DECIMAL(12,2) = 0;
    DECLARE @BaseFare DECIMAL(10,2);
    DECLARE @PerKm DECIMAL(10,2);
    DECLARE @PerMin DECIMAL(10,2);
    DECLARE @DistanceKm DECIMAL(10,2);
    DECLARE @DurationMinutes INT;
    DECLARE @BasePrice DECIMAL(12,2);
    DECLARE @SurgeMultiplier DECIMAL(5,2) = 1.0;
    
    -- Variables for surge calculation
    DECLARE @ZoneId INT;
    DECLARE @PickupTime DATETIME2(0);
    DECLARE @ServiceTypeId INT;
    DECLARE @RideTypeId INT;
    DECLARE @PendingRequestCount INT;
    DECLARE @AvailableDriverCount INT;
    DECLARE @DemandRatio DECIMAL(10,2);

    -- Get ride details and trace back to ServiceType pricing
    SELECT 
        @DistanceKm = r.DistanceKm,
        @DurationMinutes = r.DurationMinutes,
        @ZoneId = il.ZoneId,
        @PickupTime = rr.PickupAt,
        @ServiceTypeId = arp.ServiceTypeId,
        @RideTypeId = arp.RideTypeId,
        @BaseFare = st.BaseFare,
        @PerKm = st.PerKm,
        @PerMin = st.PerMin
    FROM dbo.[Ride] r
    INNER JOIN dbo.DispatchOffer do_offer ON r.OfferId = do_offer.OfferId
    INNER JOIN dbo.ItineraryLeg il ON do_offer.LegId = il.LegId
    INNER JOIN dbo.RideRequest rr ON il.RideRequestId = rr.RequestId
    INNER JOIN dbo.AllowedRideProfile arp ON rr.RideProfileId = arp.RideProfileId
    INNER JOIN dbo.Servicetype st ON arp.ServiceTypeId = st.ServiceTypeId
    WHERE r.RideId = @RideId
        AND st.Active = 1
        AND (st.ValidTo IS NULL OR st.ValidTo >= rr.PickupAt)
        AND st.ValidFrom <= rr.PickupAt;

    -- If no pricing found, return 0
    IF @BaseFare IS NULL OR @DistanceKm IS NULL OR @DurationMinutes IS NULL
        RETURN 0;

    -- Calculate base price (before surge)
    SET @BasePrice = @BaseFare + (@PerKm * @DistanceKm) + (@PerMin * @DurationMinutes);

    -- === DYNAMIC PRICING: Surge Multiplier Calculation ===
    
    -- Count pending ride requests in the same zone in last 30 minutes
    SELECT @PendingRequestCount = COUNT(DISTINCT rr.RequestId)
    FROM dbo.RideRequest rr
    INNER JOIN dbo.ItineraryLeg il ON rr.RequestId = il.RideRequestId
    INNER JOIN dbo.AllowedRideProfile arp ON rr.RideProfileId = arp.RideProfileId
    WHERE il.ZoneId = @ZoneId
        AND rr.Status IN ('Pending', 'Accepted')
        AND rr.CreatedAt >= DATEADD(MINUTE, -30, GETUTCDATE())
        AND arp.ServiceTypeId = @ServiceTypeId
        AND arp.RideTypeId = @RideTypeId;

    -- Count available drivers in the same zone for the pickup time
    SELECT @AvailableDriverCount = COUNT(DISTINCT da.EnrollId)
    FROM dbo.DriverAvailability da
    INNER JOIN dbo.UserServiceEnrollment use_enroll ON da.EnrollId = use_enroll.EnrollId
    WHERE da.GeofencezoneId = @ZoneId
        AND da.AvailabilityDate = CAST(@PickupTime AS DATE)
        AND CAST(@PickupTime AS TIME) BETWEEN da.StartsAt AND da.EndsAt
        AND use_enroll.Status = 'Approved'
        AND use_enroll.ServiceType = @ServiceTypeId
        AND use_enroll.RideType = @RideTypeId;

    -- Avoid division by zero
    IF @AvailableDriverCount = 0
        SET @AvailableDriverCount = 1;

    -- Calculate demand ratio
    SET @DemandRatio = CAST(@PendingRequestCount AS DECIMAL(10,2)) / CAST(@AvailableDriverCount AS DECIMAL(10,2));

    -- Apply surge multiplier based on demand ratio
    IF @DemandRatio > 4.0
        SET @SurgeMultiplier = 2.0;  -- High surge
    ELSE IF @DemandRatio > 2.5
        SET @SurgeMultiplier = 1.5;  -- Medium surge
    ELSE IF @DemandRatio > 1.5
        SET @SurgeMultiplier = 1.2;  -- Low surge
    ELSE
        SET @SurgeMultiplier = 1.0;  -- No surge

    -- Calculate final price with surge
    SET @FinalPrice = @BasePrice * @SurgeMultiplier;

    -- Round to 2 decimal places
    SET @FinalPrice = ROUND(@FinalPrice, 2);

    RETURN @FinalPrice;
END;
GO

PRINT 'Function ufn_CalculateRidePrice created successfully.';
GO

SET QUOTED_IDENTIFIER ON;
GO

-- ===================================  Tables =================================== --

CREATE TABLE [dbo].[User] (
    [UserId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Name] NVARCHAR(100) NOT NULL,
    [Dob] DATE NOT NULL,
    [Gender] CHAR(1) NOT NULL,
    [Email] NVARCHAR(255) NOT NULL,
    [Phone] NVARCHAR(32) NOT NULL,
    [Address] NVARCHAR(255) NOT NULL,
    [Username] NVARCHAR(30) NOT NULL UNIQUE,
    [PasswordHash] NVARCHAR(255) NOT NULL,
    [CreatedAt] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_User] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [UQ_User_Email] UNIQUE ([Email]),
    CONSTRAINT [UQ_User_Username] UNIQUE ([Username]),
    CONSTRAINT [CK_User_Gender] CHECK ([Gender] IN ('m','f', 'M', 'F'))
);  

CREATE TABLE [dbo].[Admin] (
    [AdminId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Username] NVARCHAR(30) NOT NULL UNIQUE,
    [Password] NVARCHAR(255) NOT NULL,
    CONSTRAINT [PK_Admin] PRIMARY KEY CLUSTERED ([AdminId])
);

CREATE TABLE [dbo].[CreditCard] (
    [CardId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [OwnerId] UNIQUEIDENTIFIER NOT NULL,
    [Last4] VARCHAR(4) NOT NULL,
    [Token] NVARCHAR(255) NOT NULL,
    [ExpMonth] INT NOT NULL,
    [ExpYear] INT NOT NULL,
    [IsDefault] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 0,
    [AddedAt] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2(0),
    CONSTRAINT [PK_Credit_Card] PRIMARY KEY CLUSTERED ([CardId]),
    CONSTRAINT [CK_CreditCard_Exp] CHECK ([ExpMonth] BETWEEN 1 AND 12),
    CONSTRAINT [CK_CreditCard_ExpYear] CHECK ( ( [ExpYear] > YEAR(GETUTCDATE()) ) OR ( [ExpYear] = YEAR(GETUTCDATE()) AND [ExpMonth] >= MONTH(GETUTCDATE()) ) )
);

CREATE TABLE [dbo].[Servicetype] (
    [ServiceTypeId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(255) NOT NULL,
    [BaseFare] DECIMAL(10,2) NOT NULL,
    [PerKm] DECIMAL(10,2) NOT NULL,
    [PerMin] DECIMAL(10,2) NOT NULL,
    [ValidFrom] DATETIME2(0) NOT NULL,
    [ValidTo] DATETIME2(0),
    [Active] BIT NOT NULL DEFAULT 1,
    CONSTRAINT [PK_ServiceType] PRIMARY KEY CLUSTERED ([ServiceTypeId])
);

CREATE TABLE [dbo].[Ridetype] (
    [RideTypeId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Name] NVARCHAR(100) NOT NULL,
    [Description] NVARCHAR(255),
    CONSTRAINT [PK_RideType] PRIMARY KEY CLUSTERED ([RideTypeId])
);

CREATE TABLE [dbo].[Payment] (
    [PaymentId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [GrossAmount] DECIMAL(9,2),
    [OsrhFee] DECIMAL(9,2),
    [DriverPayout] DECIMAL(9,2),
    [PaidAt] DATETIME2(0),
    [Method] NVARCHAR(100) NOT NULL,
    CONSTRAINT [PK_Payment] PRIMARY KEY CLUSTERED ([PaymentId]),
    CONSTRAINT [CK_Method] CHECK ([Method] IN ('CreditCard','Cash'))
);

CREATE TABLE [dbo].[Rating] (
    [RatingId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [AuthorUserId] UNIQUEIDENTIFIER NOT NULL,
    [TargetUserId] UNIQUEIDENTIFIER NOT NULL,
    [Stars] INT NOT NULL,
    [Comment] NVARCHAR(255),
    [CreatedAt] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Rating] PRIMARY KEY CLUSTERED ([RatingId]),
    CONSTRAINT [CK_Rating_Stars] CHECK ([Stars] BETWEEN 1 AND 5)
);

CREATE TABLE [dbo].[Geofencezone] (
    [ZoneId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [MinLat] DECIMAL(9,6),
    [MinLng] DECIMAL(9,6),
    [MaxLat] DECIMAL(9,6),
    [MaxLng] DECIMAL(9,6),
    [Name] NVARCHAR(100),
    CONSTRAINT [PK_GeofenceZone] PRIMARY KEY CLUSTERED ([ZoneId]),
    CONSTRAINT [CK_GeofenceZone_Coords] CHECK ([MaxLat] > [MinLat] AND [MaxLng] > [MinLng])
);

CREATE TABLE [dbo].[Operator] (
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [ApprovedByAdmin] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_Operator] PRIMARY KEY CLUSTERED ([UserId])
);

CREATE TABLE [dbo].[Passenger] (
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [CreditCardId] UNIQUEIDENTIFIER,
    CONSTRAINT [PK_Passenger] PRIMARY KEY CLUSTERED ([UserId])
);

CREATE TABLE [dbo].[Inspector] (
    [InspectorId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Email] NVARCHAR(255) NOT NULL,
    [PasswordHash] NVARCHAR(255) NOT NULL,
    CONSTRAINT [PK_Inspector] PRIMARY KEY CLUSTERED ([InspectorId])
);

CREATE TABLE [dbo].[Company] (
    [CompanyId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Name] NVARCHAR(100) NOT NULL,
    [CreditCardId] UNIQUEIDENTIFIER,
    CONSTRAINT [PK_Company] PRIMARY KEY CLUSTERED ([CompanyId]),
    CONSTRAINT [UQ_Company_Name] UNIQUE ([Name])
);

CREATE TABLE [dbo].[UserPreferences] (
    [UserPreferencesId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWSEQUENTIALID(),
    [UserId] UNIQUEIDENTIFIER NOT NULL UNIQUE,
    [NotificationsEnabled] BIT NOT NULL DEFAULT 0,
    [Language] CHAR(2) NOT NULL DEFAULT 'en',
    [LocEnabled] BIT NOT NULL DEFAULT 0,
    [Timezone] NVARCHAR(100),
    [UpdatedAt] DATETIME2(0) NULL,
    CONSTRAINT [PK_UserPreferences] PRIMARY KEY CLUSTERED ([UserPreferencesId]),
    CONSTRAINT [CK_UserPreferences_Languages] CHECK ([Language] IN ('en','es','fr','de','it','el'))
);

CREATE TABLE [dbo].[ServicetypeAllowedRidetype] (
    [Servicetype] UNIQUEIDENTIFIER NOT NULL,
    [Ridetype] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_SERVICETYPE_ALLOWED_RIDETYPE] PRIMARY KEY CLUSTERED ([Servicetype], [Ridetype])
);

CREATE TABLE [dbo].[Ride] (
    [RideId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [OfferId] UNIQUEIDENTIFIER NOT NULL,
    [StartedAt] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    [EndedAt] DATETIME2(0) NOT NULL,
    [PriceFinal] DECIMAL(12,2) NOT NULL,
    [Status] NVARCHAR(100) NOT NULL DEFAULT('Scheduled'),
    [Rating] UNIQUEIDENTIFIER,
    [Payment] UNIQUEIDENTIFIER,
    CONSTRAINT [PK_Ride] PRIMARY KEY CLUSTERED ([RideId]),
    CONSTRAINT [CK_Ride_Status] CHECK ([Status] IN ('Scheduled','InProgress','Completed','Cancelled')),
    CONSTRAINT [CK_Ride_Time] CHECK ([EndedAt] > [StartedAt])
);

CREATE TABLE [dbo].[GdprRequest] (
    [GdprId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [Type] NVARCHAR(100) NOT NULL,
    [Status] NVARCHAR(100) NOT NULL DEFAULT('Pending'),
    [RequestedAt] DATETIME2(0) NOT NULL,
    [DecidedAt] DATETIME2(0),
    CONSTRAINT [PK_GdprRequest] PRIMARY KEY CLUSTERED ([GdprId]),
    CONSTRAINT [CK_GdprRequest_Type] CHECK ([Type] IN ('DataAccess','DataDeletion','DataExport', 'DataCorrection')),
    CONSTRAINT [CK_GdprRequest_Status] CHECK ([Status] IN ('Pending','Approved','Denied'))
);

CREATE TABLE [dbo].[Bridge] (
    [BridgeId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Name] NVARCHAR(100),
    [FromZone] UNIQUEIDENTIFIER NOT NULL,
    [ToZone] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_Bridge] PRIMARY KEY CLUSTERED ([BridgeId])
);

CREATE TABLE [dbo].[Driver] (
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [Company] UNIQUEIDENTIFIER,
    [CreditCard] UNIQUEIDENTIFIER,
    CONSTRAINT [PK_Driver] PRIMARY KEY CLUSTERED ([UserId])
);

CREATE TABLE [dbo].[VehicleType] (
    [VehicleTypeId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Name] NVARCHAR(100) NOT NULL,
    CONSTRAINT [PK_VehicleType] PRIMARY KEY CLUSTERED ([VehicleTypeId])
);

CREATE TABLE [dbo].[AllowedRideProfile] (
    [RideProfileId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [ServiceTypeId] UNIQUEIDENTIFIER NOT NULL,
    [RideTypeId] UNIQUEIDENTIFIER NOT NULL,
    [VehicleTypeId] UNIQUEIDENTIFIER NOT NULL,
    [ProfileName] NVARCHAR(100),
    CONSTRAINT [PK_AllowedRideProfile] PRIMARY KEY CLUSTERED ([RideProfileId])
);

CREATE TABLE [dbo].[RideRequest] (
    [RequestId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Passenger] UNIQUEIDENTIFIER NOT NULL,
    [NumOfPeople] INT NOT NULL,
    [PickupAt] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    [PickupLat] DECIMAL(9,6) NOT NULL,
    [PickupLng] DECIMAL(9,6) NOT NULL,
    [DropLat] DECIMAL(9,6) NOT NULL,
    [DropLng] DECIMAL(9,6) NOT NULL,
    [PickupCountry] NVARCHAR(255),
    [PickupRegion] NVARCHAR(255),
    [PickupCity] NVARCHAR(255),
    [PickupDistrict] NVARCHAR(255),
    [PickupPostalCode] NVARCHAR(255),
    [DropCountry] NVARCHAR(255),
    [DropRegion] NVARCHAR(255),
    [DropCity] NVARCHAR(255),
    [DropDistrict] NVARCHAR(255),
    [DropPostalCode] NVARCHAR(255),
    [CreatedAt] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    [Status] NVARCHAR(100) NOT NULL DEFAULT('Pending'),
    [RideProfileId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_RideRequest] PRIMARY KEY CLUSTERED ([RequestId]),
    CONSTRAINT [CK_RideRequest_Status] CHECK ([Status] IN ('Pending','Accepted','Declined','Cancelled','Completed'))
);

CREATE TABLE [dbo].[InAppMessage] (
    [MsgId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Body] NVARCHAR(MAX) NOT NULL,
    [SentAt] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    [Ride] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_InAppMessage] PRIMARY KEY CLUSTERED ([MsgId])
);

CREATE TABLE [dbo].[GdprLog] (
    [LogId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [GdprId] UNIQUEIDENTIFIER NOT NULL,
    [ActorUserId] UNIQUEIDENTIFIER NOT NULL,
    [LoggedAt] DATETIME2(0),
    [Note] NVARCHAR(MAX),
    CONSTRAINT [PK_GdprLog] PRIMARY KEY CLUSTERED ([LogId])
);

CREATE TABLE [dbo].[CompanyRepresentative] (
    [CompanyId] UNIQUEIDENTIFIER NOT NULL,
    [RepresentativeId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_CompanyRepresentative] PRIMARY KEY CLUSTERED ([RepresentativeId])
);

CREATE TABLE [dbo].[Vehicle] (
    [VehicleId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [RideTypeSupported] NVARCHAR(100),
    [VehicleTypeId] UNIQUEIDENTIFIER NOT NULL,
    [Seats] INT NOT NULL,
    [CargoVolume] DECIMAL(10,2),
    [CargoWeight] DECIMAL(10,2),
    [Photos] NVARCHAR(512) NOT NULL,
    [Status] NVARCHAR(100),
    [CompanyRepresentative] UNIQUEIDENTIFIER,
    [Driver] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_Vehicle] PRIMARY KEY CLUSTERED ([VehicleId]),
    CONSTRAINT [CK_Seats_Positive] CHECK ([Seats] > 0),
    CONSTRAINT [CK_CargoWeight_Positive] CHECK ([CargoWeight] >= 0),
    CONSTRAINT [CK_CargoVolume_Positive] CHECK ([CargoVolume] >= 0),
    CONSTRAINT [CK_Vehicle_Status] CHECK ([Status] IN ('Active','Inactive'))
);

CREATE TABLE [dbo].[PersonDocument] (
    [DocId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [DriverId] UNIQUEIDENTIFIER NOT NULL,
    [DocType] NVARCHAR(100) NOT NULL,
    [IssueDate] DATETIME2(0) NOT NULL ,
    [UploadedAt] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    [ExpiryDate] DATETIME2(0) NOT NULL,
    [FileUrl] NVARCHAR(512) NOT NULL,
    CONSTRAINT [PK_PersonDocument] PRIMARY KEY CLUSTERED ([DocId])
);

CREATE TABLE [dbo].[ItineraryLeg] (
    [LegId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [SeqNo] INT NOT NULL,
    [ViaBridgeId] UNIQUEIDENTIFIER,
    [RideRequestId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_ItineraryLeg] PRIMARY KEY CLUSTERED ([LegId])
);

CREATE TABLE [dbo].[VehicleDocument] (
    [VehDocId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [DocType] NVARCHAR(100) NOT NULL,
    [IssueDate] DATETIME2(0) NOT NULL,
    [UploadedAt] DATETIME2(0) DEFAULT GETUTCDATE(),
    [ExpiryDate] DATETIME2(0) NOT NULL,
    [FileUrl] NVARCHAR(512) NOT NULL,
    [Image] NVARCHAR(512) NOT NULL,
    CONSTRAINT [PK_VehicleDocument] PRIMARY KEY CLUSTERED ([VehDocId])
);

CREATE TABLE [dbo].[VehicleTest] (
    [TestId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [CheckDate] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
    [ExpiryDate] AS (DATEADD(YEAR, 1, [CheckDate])),
    [Comments] NVARCHAR(MAX) DEFAULT 'No comments',
    CONSTRAINT [PK_VehicleTest] PRIMARY KEY CLUSTERED ([TestId])
);

CREATE TABLE [dbo].[UserServiceEnrollment] (
    [EnrollId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [Status] NVARCHAR(100),
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [ServiceType] UNIQUEIDENTIFIER NOT NULL,
    [RideType] UNIQUEIDENTIFIER NOT NULL,
    [ApprovedBy] NVARCHAR(255),
    [ApprovedAt] NVARCHAR(255),
    [ApprovedById] UNIQUEIDENTIFIER,   
    [Driver] UNIQUEIDENTIFIER,
    [CompanyRepresentative] UNIQUEIDENTIFIER,
    CONSTRAINT [PK_UserServiceEnrollment] PRIMARY KEY CLUSTERED ([EnrollId]),
    CONSTRAINT [CK_UserServiceEnrollment_Status] CHECK ([Status] IN ('Pending','Approved','Rejected'))
);

CREATE TABLE [dbo].[VehicleAvailability] (
    [VehicleId] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [StartsAt] DATETIME2(0) NOT NULL,
    [EndsAt] DATETIME2(0) NOT NULL,
    [IsRecurring] BIT NOT NULL DEFAULT 0,
    CONSTRAINT [CK_VehicleAvailability_Time] CHECK ([EndsAt] > [StartsAt])
);

CREATE TABLE [dbo].[DispatchOffer] (
    [OfferId] UNIQUEIDENTIFIER NOT NULL UNIQUE DEFAULT NEWID(),
    [LegId] UNIQUEIDENTIFIER NOT NULL,
    [DriverId] UNIQUEIDENTIFIER,
    [CompanyId] UNIQUEIDENTIFIER,
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [Status] NVARCHAR(100) NOT NULL DEFAULT 'Sent',
    [SentAt] DATETIME2(0) DEFAULT GETUTCDATE(),
    [RespondedAt] DATETIME2(0),
    CONSTRAINT [PK_DispatchOffer] PRIMARY KEY CLUSTERED ([OfferId]),
    CONSTRAINT [CK_DispatchOffer_Status] CHECK ([Status] IN ('Sent','Accepted','Declined','Expired'))
);

CREATE TABLE [dbo].[VehicleLocationLive] (
    [VehicleId] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Lat] DECIMAL(9,6) NOT NULL,
    [Lng] DECIMAL(9,6) NOT NULL,
    [UpdatedAt] DATETIME2(0) NOT NULL DEFAULT GETUTCDATE(),
);

CREATE TABLE [dbo].[LegCrossesBridge] (
    [ItineraryLeg] UNIQUEIDENTIFIER NOT NULL,
    [Bridge] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_LegCrossesBridge] PRIMARY KEY CLUSTERED ([ItineraryLeg], [Bridge])
);


-- ===================================  FK and other constraints =================================== --

/* UserPreferences → User */
ALTER TABLE [dbo].[UserPreferences]
ADD CONSTRAINT [FK_UserPreferences_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE;

/* Operator → User, Admin */
ALTER TABLE [dbo].[Operator]
ADD CONSTRAINT [FK_Operator_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Operator_ApprovedByAdmin]
    FOREIGN KEY ([ApprovedByAdmin]) REFERENCES [dbo].[Admin]([AdminId])
    ON DELETE NO ACTION;

/* Passenger → User, CreditCard */
ALTER TABLE [dbo].[Passenger]
ADD CONSTRAINT [FK_Passenger_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Passenger_CreditCard]
    FOREIGN KEY ([CreditCardId]) REFERENCES [dbo].[CreditCard]([CardId])
    ON DELETE SET NULL;

/* CreditCard → User (Owner) */
ALTER TABLE [dbo].[CreditCard]
ADD CONSTRAINT [FK_CreditCard_Owner]
    FOREIGN KEY ([OwnerId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE;

/* Company → CreditCard */
ALTER TABLE [dbo].[Company]
ADD CONSTRAINT [FK_Company_CreditCard]
    FOREIGN KEY ([CreditCardId]) REFERENCES [dbo].[CreditCard]([CardId])
    ON DELETE SET NULL;

/* Rating → User (author, target) */
ALTER TABLE [dbo].[Rating]
ADD CONSTRAINT [FK_Rating_AuthorUser]
    FOREIGN KEY ([AuthorUserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Rating_TargetUser]
    FOREIGN KEY ([TargetUserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE,
    CONSTRAINT [CK_Rating_NoSelf]
    CHECK ([AuthorUserId] <> [TargetUserId]);

/* ServicetypeAllowedRidetype (junction) */
ALTER TABLE [dbo].[ServicetypeAllowedRidetype]
ADD CONSTRAINT [FK_SvcAllowedRide_Servicetype]
    FOREIGN KEY ([Servicetype]) REFERENCES [dbo].[Servicetype]([ServiceTypeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_SvcAllowedRide_Ridetype]
    FOREIGN KEY ([Ridetype]) REFERENCES [dbo].[Ridetype]([RideTypeId])
    ON DELETE CASCADE;

/* Driver → User, Company, CreditCard */
ALTER TABLE [dbo].[Driver]
ADD CONSTRAINT [FK_Driver_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Driver_Company]
    FOREIGN KEY ([Company]) REFERENCES [dbo].[Company]([CompanyId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Driver_CreditCard]
    FOREIGN KEY ([CreditCard]) REFERENCES [dbo].[CreditCard]([CardId])
    ON DELETE SET NULL;

/* Vehicle → VehicleType, CompanyRepresentative, Driver */
ALTER TABLE [dbo].[Vehicle]
ADD CONSTRAINT [FK_Vehicle_VehicleType]
    FOREIGN KEY ([VehicleTypeId]) REFERENCES [dbo].[VehicleType]([VehicleTypeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Vehicle_CompanyRepresentative]
    FOREIGN KEY ([CompanyRepresentative]) REFERENCES [dbo].[CompanyRepresentative]([RepresentativeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Vehicle_Driver]
    FOREIGN KEY ([Driver]) REFERENCES [dbo].[Driver]([UserId])
    ON DELETE CASCADE;

/* CompanyRepresentative → Company, User */
ALTER TABLE [dbo].[CompanyRepresentative]
ADD CONSTRAINT [FK_CompanyRepresentative_Company]
    FOREIGN KEY ([CompanyId]) REFERENCES [dbo].[Company]([CompanyId])
    ON DELETE CASCADE;

/* PersonDocument → Driver */
ALTER TABLE [dbo].[PersonDocument]
ADD CONSTRAINT [FK_PersonDocument_Driver]
    FOREIGN KEY ([DriverId]) REFERENCES [dbo].[Driver]([UserId])
    ON DELETE CASCADE;

/* VehicleDocument → Vehicle */
ALTER TABLE [dbo].[VehicleDocument]
ADD CONSTRAINT [FK_VehicleDocument_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE CASCADE;

/* VehicleTest → Vehicle */
ALTER TABLE [dbo].[VehicleTest]
ADD CONSTRAINT [FK_VehicleTest_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE CASCADE;

/* VehicleAvailability → Vehicle */
ALTER TABLE [dbo].[VehicleAvailability]
ADD CONSTRAINT [FK_VehicleAvailability_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE CASCADE;

/* VehicleLocationLive → Vehicle */
ALTER TABLE [dbo].[VehicleLocationLive]
ADD CONSTRAINT [FK_VehicleLocationLive_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE CASCADE;

ALTER TABLE [dbo].[UserServiceEnrollment]
ADD CONSTRAINT [FK_Enroll_Vehicle] FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId]) ON DELETE CASCADE,
    CONSTRAINT [FK_Enroll_ServiceType] FOREIGN KEY ([ServiceType]) REFERENCES [dbo].[Servicetype]([ServiceTypeId]) ON DELETE CASCADE,
    CONSTRAINT [FK_Enroll_RideType] FOREIGN KEY ([RideType]) REFERENCES [dbo].[Ridetype]([RideTypeId]) ON DELETE CASCADE,
    CONSTRAINT [FK_Enroll_Driver] FOREIGN KEY ([Driver]) REFERENCES [dbo].[Driver]([UserId]) ON DELETE CASCADE,
    CONSTRAINT [FK_Enroll_ApprovedByAdmin] FOREIGN KEY ([ApprovedById]) REFERENCES [dbo].[Admin]([AdminId]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Enroll_CompanyRep] FOREIGN KEY ([CompanyRepresentative]) REFERENCES [dbo].[CompanyRepresentative]([RepresentativeId]) ON DELETE CASCADE;

/* AllowedRideProfile → ServiceType, RideType, VehicleType */
ALTER TABLE [dbo].[AllowedRideProfile]
ADD CONSTRAINT [FK_AllowedRideProfile_ServiceType]
    FOREIGN KEY ([ServiceTypeId]) REFERENCES [dbo].[Servicetype]([ServiceTypeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_AllowedRideProfile_RideType]
    FOREIGN KEY ([RideTypeId]) REFERENCES [dbo].[Ridetype]([RideTypeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_AllowedRideProfile_VehicleType]
    FOREIGN KEY ([VehicleTypeId]) REFERENCES [dbo].[VehicleType]([VehicleTypeId])
    ON DELETE CASCADE;

/* Bridge → Geofencezone */
ALTER TABLE [dbo].[Bridge]
ADD CONSTRAINT [FK_Bridge_FromZone]
    FOREIGN KEY ([FromZone]) REFERENCES [dbo].[Geofencezone]([ZoneId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Bridge_ToZone]
    FOREIGN KEY ([ToZone]) REFERENCES [dbo].[Geofencezone]([ZoneId])
    ON DELETE CASCADE;

/* ItineraryLeg → Bridge, RideRequest */
ALTER TABLE [dbo].[ItineraryLeg]
ADD CONSTRAINT [FK_ItineraryLeg_Bridge]
    FOREIGN KEY ([ViaBridgeId]) REFERENCES [dbo].[Bridge]([BridgeId])
    ON DELETE SET NULL,
    CONSTRAINT [FK_ItineraryLeg_RideRequest]
    FOREIGN KEY ([RideRequestId]) REFERENCES [dbo].[RideRequest]([RequestId])
    ON DELETE CASCADE;

/* LegCrossesBridge (junction) → ItineraryLeg, Bridge */
ALTER TABLE [dbo].[LegCrossesBridge]
ADD CONSTRAINT [FK_LegCrossesBridge_ItineraryLeg]
    FOREIGN KEY ([ItineraryLeg]) REFERENCES [dbo].[ItineraryLeg]([LegId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_LegCrossesBridge_Bridge]
    FOREIGN KEY ([Bridge]) REFERENCES [dbo].[Bridge]([BridgeId])
    ON DELETE CASCADE;

/* RideRequest → AllowedRideProfile, Passenger */
ALTER TABLE [dbo].[RideRequest]
ADD CONSTRAINT [FK_RideRequest_AllowedRideProfile]
    FOREIGN KEY ([RideProfileId]) REFERENCES [dbo].[AllowedRideProfile]([RideProfileId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_RideRequest_Passenger]
    FOREIGN KEY ([Passenger]) REFERENCES [dbo].[Passenger]([UserId])
    ON DELETE CASCADE;

/* DispatchOffer → ItineraryLeg, Driver, Company, Vehicle */
ALTER TABLE [dbo].[DispatchOffer]
ADD CONSTRAINT [FK_DispatchOffer_ItineraryLeg]
    FOREIGN KEY ([LegId]) REFERENCES [dbo].[ItineraryLeg]([LegId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_DispatchOffer_Driver]
    FOREIGN KEY ([DriverId]) REFERENCES [dbo].[Driver]([UserId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_DispatchOffer_Company]
    FOREIGN KEY ([CompanyId]) REFERENCES [dbo].[Company]([CompanyId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_DispatchOffer_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE CASCADE;

/* Ride → DispatchOffer, Rating, Payment */
ALTER TABLE [dbo].[Ride]
ADD CONSTRAINT [FK_Ride_Offer]
    FOREIGN KEY ([OfferId]) REFERENCES [dbo].[DispatchOffer]([OfferId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Ride_Rating]
    FOREIGN KEY ([Rating]) REFERENCES [dbo].[Rating]([RatingId])
    ON DELETE SET NULL,
    CONSTRAINT [FK_Ride_Payment]
    FOREIGN KEY ([Payment]) REFERENCES [dbo].[Payment]([PaymentId])
    ON DELETE SET NULL;

/* InAppMessage → Ride */
ALTER TABLE [dbo].[InAppMessage]
ADD CONSTRAINT [FK_InAppMessage_Ride]
    FOREIGN KEY ([Ride]) REFERENCES [dbo].[Ride]([RideId])
    ON DELETE CASCADE;

/* GDPR: Request & Log */
ALTER TABLE [dbo].[GdprRequest]
ADD CONSTRAINT [FK_GdprRequest_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE;

ALTER TABLE [dbo].[GdprLog]
ADD CONSTRAINT [FK_GdprLog_GdprRequest]
    FOREIGN KEY ([GdprId]) REFERENCES [dbo].[GdprRequest]([GdprId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_GdprLog_ActorUser]
    FOREIGN KEY ([ActorUserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE NO ACTION;

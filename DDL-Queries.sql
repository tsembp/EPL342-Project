SET QUOTED_IDENTIFIER ON;
GO

-- ================================ Custom Types ================================ --
CREATE TYPE dbo.Gender FROM CHAR(1);
CREATE TYPE dbo.MoneyAmount FROM DECIMAL(10,2);
CREATE TYPE dbo.LongText FROM NVARCHAR(255);
CREATE TYPE dbo.UtcStamp FROM DATETIME2(0);
CREATE TYPE dbo.PartyType FROM CHAR(1);

GO

-- =================================== Tables =================================== --

CREATE TABLE [dbo].[User] (
    [UserId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [FirstName] NVARCHAR(50) NOT NULL DEFAULT '',
    [LastName] NVARCHAR(50) NOT NULL DEFAULT '',
    [Dob] DATE NOT NULL CHECK (Dob < GETDATE()),
    [Gender] Gender NOT NULL,
    [Email] LongText NOT NULL,
    [Phone] NVARCHAR(32) NOT NULL,
    [Address] LongText NOT NULL,
    [Username] NVARCHAR(30) NOT NULL,
    [PasswordHash] LongText NOT NULL,
    [PartyId] UNIQUEIDENTIFIER NOT NULL,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] UtcStamp,
    CONSTRAINT [PK_User] PRIMARY KEY CLUSTERED ([UserId]),
    CONSTRAINT [UQ_User_Email] UNIQUE ([Email]),
    CONSTRAINT [UQ_User_Username] UNIQUE ([Username]),
    CONSTRAINT [UQ_User_PartyId] UNIQUE ([PartyId]),
    CONSTRAINT [CK_User_Gender] CHECK ([Gender] IN ('m','f', 'M', 'F'))
);

CREATE TABLE [dbo].[Admin] (
    [AdminId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [Username] NVARCHAR(30) NOT NULL UNIQUE,
    [PasswordHash] LongText NOT NULL,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Admin] PRIMARY KEY CLUSTERED ([AdminId])
);

CREATE TABLE [dbo].[CreditCard] (
    [CardId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [OwnerId] UNIQUEIDENTIFIER NOT NULL,
    [Last4] CHAR(4) NOT NULL,
    [Token] LongText NOT NULL UNIQUE,
    [ExpMonth] INT NOT NULL,
    [ExpYear] INT NOT NULL,
    [IsDefault] BIT NOT NULL DEFAULT 0,
    [IsActive] BIT NOT NULL DEFAULT 0,
    [AddedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] UtcStamp,
    CONSTRAINT [PK_Credit_Card] PRIMARY KEY CLUSTERED ([CardId]),
    CONSTRAINT [CK_CreditCard_Exp] CHECK ([ExpMonth] BETWEEN 1 AND 12),
    CONSTRAINT [CK_CreditCard_ExpYear] CHECK ( ( [ExpYear] > YEAR(GETUTCDATE()) ) OR ( [ExpYear] = YEAR(GETUTCDATE()) AND [ExpMonth] >= MONTH(GETUTCDATE()) ) ),
    CONSTRAINT [CK_CreditCard_Last4] CHECK ([Last4] LIKE '[0-9][0-9][0-9][0-9]')
);

CREATE TABLE [dbo].[Party] (
    [PartyId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [PartyType] PartyType NOT NULL, -- 'U' = User, 'C' = Company
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Party] PRIMARY KEY CLUSTERED ([PartyId]),
    CONSTRAINT [CK_Party_Type] CHECK ([PartyType] IN ('U','C'))
);

CREATE TABLE [dbo].[Servicetype] (
    [ServiceTypeId] INT IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] LongText NOT NULL,
    [BaseFare] MoneyAmount NOT NULL,
    [PerKm] MoneyAmount NOT NULL,
    [PerMin] MoneyAmount NOT NULL,
    [ValidFrom] UtcStamp NOT NULL,
    [ValidTo] UtcStamp,
    [Active] BIT NOT NULL DEFAULT 1,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] UtcStamp,
    CONSTRAINT [PK_ServiceType] PRIMARY KEY CLUSTERED ([ServiceTypeId]),
    CONSTRAINT [CK_ServiceType_ValidTo] CHECK ([ValidTo] IS NULL OR [ValidTo] > [ValidFrom])
);

CREATE TABLE [dbo].[Ridetype] (
    [RideTypeId] INT IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL,
    [Description] LongText,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] UtcStamp,
    CONSTRAINT [PK_RideType] PRIMARY KEY CLUSTERED ([RideTypeId])
);

CREATE TABLE [dbo].[Payment] (
    [PaymentId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [SenderPartyId] UNIQUEIDENTIFIER NOT NULL,
    [ReceiverPartyId] UNIQUEIDENTIFIER NOT NULL,
    [GrossAmount] MoneyAmount NOT NULL DEFAULT 0,
    [OsrhFee] MoneyAmount NOT NULL DEFAULT 0,
    [DriverPayout] MoneyAmount NOT NULL DEFAULT 0,
    [PaidAt] UtcStamp,
    [Method] NVARCHAR(100) NOT NULL,
    [Status] NVARCHAR(100) NOT NULL DEFAULT 'Pending',
    CONSTRAINT [PK_Payment] PRIMARY KEY CLUSTERED ([PaymentId]),
    CONSTRAINT [CK_Method] CHECK ([Method] IN ('CreditCard','Cash')),
    CONSTRAINT [CK_Payment_Status] CHECK ([Status] IN ('Pending','Completed','Failed','Refunded')),
    CONSTRAINT [CK_Payment_Amounts] CHECK ([GrossAmount] >= 0 AND [OsrhFee] >= 0 AND [DriverPayout] >= 0)
);

CREATE TABLE [dbo].[Rating] (
    [RatingId] INT IDENTITY(1,1) NOT NULL,
    [AuthorUserId] UNIQUEIDENTIFIER NOT NULL,
    [TargetUserId] UNIQUEIDENTIFIER NOT NULL,
    [Stars] INT NOT NULL,
    [Comment] LongText,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] UtcStamp,
    CONSTRAINT [PK_Rating] PRIMARY KEY CLUSTERED ([RatingId]),
    CONSTRAINT [CK_Rating_Stars] CHECK ([Stars] BETWEEN 1 AND 5)
);

CREATE TABLE [dbo].[Geofencezone] (
    [ZoneId] INT IDENTITY(1,1) NOT NULL,
    [MinLat] DECIMAL(9,6),
    [MinLng] DECIMAL(9,6),
    [MaxLat] DECIMAL(9,6),
    [MaxLng] DECIMAL(9,6),
    [Name] NVARCHAR(100),
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] UtcStamp,
    CONSTRAINT [PK_GeofenceZone] PRIMARY KEY CLUSTERED ([ZoneId]),
    CONSTRAINT [CK_GeofenceZone_Coords] CHECK ([MaxLat] > [MinLat] AND [MaxLng] > [MinLng])
);

CREATE TABLE [dbo].[Operator] (
    [OperatorId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [Email] LongText NOT NULL,
    [Username] NVARCHAR(30) NOT NULL UNIQUE,
    [PasswordHash] LongText NOT NULL,
    [ApprovedByAdmin] UNIQUEIDENTIFIER NOT NULL,
    [ApprovedAt] UtcStamp NOT NULL,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Operator] PRIMARY KEY CLUSTERED ([OperatorId])
);

CREATE TABLE [dbo].[Passenger] (
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_Passenger] PRIMARY KEY CLUSTERED ([UserId])
);

CREATE TABLE [dbo].[Inspector] (
    [InspectorId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [Email] LongText NOT NULL,
    [Username] NVARCHAR(30) NOT NULL UNIQUE,
    [PasswordHash] LongText NOT NULL,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Inspector] PRIMARY KEY CLUSTERED ([InspectorId])
);

CREATE TABLE [dbo].[Company] (
    [CompanyId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [Name] NVARCHAR(100) NOT NULL,
    [PartyId] UNIQUEIDENTIFIER NOT NULL,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [PK_Company] PRIMARY KEY CLUSTERED ([CompanyId]),
    CONSTRAINT [UQ_Company_PartyId] UNIQUE ([PartyId]),
    CONSTRAINT [UQ_Company_Name] UNIQUE ([Name])
);

CREATE TABLE [dbo].[UserPreferences] (
    [UserPreferencesId] INT IDENTITY(1,1) NOT NULL,
    [UserId] UNIQUEIDENTIFIER NOT NULL UNIQUE,
    [NotificationsEnabled] BIT NOT NULL DEFAULT 0,
    [Language] CHAR(2) NOT NULL DEFAULT 'en',
    [LocEnabled] BIT NOT NULL DEFAULT 0,
    [Timezone] NVARCHAR(100),
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] UtcStamp NULL,
    CONSTRAINT [PK_UserPreferences] PRIMARY KEY CLUSTERED ([UserPreferencesId]),
    CONSTRAINT [CK_UserPreferences_Languages] CHECK ([Language] IN ('en','es','fr','de','it','el'))
);

CREATE TABLE [dbo].[ServicetypeAllowedRidetype] (
    [ServiceTypeID] INT NOT NULL,
    [RideTypeID] INT NOT NULL,
    CONSTRAINT [PK_ServicetypeAllowedRidetype] PRIMARY KEY CLUSTERED ([ServiceTypeID], [RideTypeID])
);

CREATE TABLE [dbo].[Ride] (
    [RideId] INT IDENTITY(1,2) NOT NULL,
    [OfferId] INT NOT NULL,
    [DriverUserId] UNIQUEIDENTIFIER NOT NULL,
    [PassengerUserId] UNIQUEIDENTIFIER NOT NULL,
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [StartedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [EndedAt] UtcStamp NOT NULL,
    [PriceFinal] DECIMAL(12,2) NOT NULL,
    [Status] NVARCHAR(100) NOT NULL DEFAULT('Scheduled'),
    [Rating] INT,
    [Payment] UNIQUEIDENTIFIER,
    CONSTRAINT [PK_Ride] PRIMARY KEY CLUSTERED ([RideId]),
    CONSTRAINT [CK_Ride_Status] CHECK ([Status] IN ('Scheduled','InProgress','Completed','Cancelled')),
    CONSTRAINT [CK_Ride_Time] CHECK ([EndedAt] > [StartedAt])
);

CREATE TABLE [dbo].[GdprRequest] (
    [GdprId] INT IDENTITY(1,1) NOT NULL,
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [Type] NVARCHAR(100) NOT NULL,
    [Status] NVARCHAR(100) NOT NULL DEFAULT('Pending'),
    [RequestedAt] UtcStamp NOT NULL,
    [DecidedAt] UtcStamp,
    CONSTRAINT [PK_GdprRequest] PRIMARY KEY CLUSTERED ([GdprId]),
    CONSTRAINT [CK_GdprRequest_Type] CHECK ([Type] IN ('DataAccess','DataDeletion','DataExport', 'DataCorrection')),
    CONSTRAINT [CK_GdprRequest_Status] CHECK ([Status] IN ('Pending','Approved','Denied'))
);

CREATE TABLE [dbo].[Bridge] (
    [BridgeId] INT IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(100),
    [FromZone] INT NOT NULL,
    [ToZone] INT NOT NULL,
    CONSTRAINT [PK_Bridge] PRIMARY KEY CLUSTERED ([BridgeId])
);

CREATE TABLE [dbo].[Driver] (
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [Company] UNIQUEIDENTIFIER,
    CONSTRAINT [PK_Driver] PRIMARY KEY CLUSTERED ([UserId])
);

CREATE TABLE [dbo].[VehicleType] (
    [VehicleTypeId] INT IDENTITY(1,1) NOT NULL,
    [Name] NVARCHAR(100) NOT NULL UNIQUE,
    CONSTRAINT [PK_VehicleType] PRIMARY KEY CLUSTERED ([VehicleTypeId])
);

CREATE TABLE [dbo].[AllowedRideProfile] (
    [RideProfileId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [ServiceTypeId] INT NOT NULL,
    [RideTypeId] INT NOT NULL,
    [VehicleTypeId] INT NOT NULL,
    [ProfileName] NVARCHAR(100),
    CONSTRAINT [PK_AllowedRideProfile] PRIMARY KEY CLUSTERED ([RideProfileId])
);

CREATE TABLE [dbo].[RideRequest] (
    [RequestId] INT IDENTITY(1,2) NOT NULL,
    [PassengerId] UNIQUEIDENTIFIER NOT NULL,
    [NumOfPeople] INT NOT NULL,
    [PickupAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [PickupLat] DECIMAL(9,6) NOT NULL,
    [PickupLng] DECIMAL(9,6) NOT NULL,
    [DropLat] DECIMAL(9,6) NOT NULL,
    [DropLng] DECIMAL(9,6) NOT NULL,
    [PickupCountry] LongText,
    [PickupRegion] LongText,
    [PickupCity] LongText,
    [PickupDistrict] LongText,
    [PickupPostalCode] LongText,
    [DropCountry] LongText,
    [DropRegion] LongText,
    [DropCity] LongText,
    [DropDistrict] LongText,
    [DropPostalCode] LongText,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] UtcStamp,
    [Status] NVARCHAR(100) NOT NULL DEFAULT('Pending'),
    [RideProfileId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_RideRequest] PRIMARY KEY CLUSTERED ([RequestId]),
    CONSTRAINT [CK_RideRequest_NumOfPeople] CHECK ([NumOfPeople] > 0),
    CONSTRAINT [CK_RideRequest_Status] CHECK ([Status] IN ('Pending','Accepted','Declined','Cancelled','Completed','Edited'))
);

CREATE TABLE [dbo].[RideRequestLog] (
    [LogEntryId] BIGINT IDENTITY(1,1) PRIMARY KEY,
    [RequestId] INT NOT NULL, -- same ID as in RideRequest
    [Operation] CHAR(1) NOT NULL,
    [ChangedAt] DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME(),
    [ChangedBy] UNIQUEIDENTIFIER NULL,

    -- Snapshot of ride request
    [PassengerId] UNIQUEIDENTIFIER NOT NULL,
    [NumOfPeople] INT NOT NULL,
    [PickupAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [PickupLat] DECIMAL(9,6) NOT NULL,
    [PickupLng] DECIMAL(9,6) NOT NULL,
    [DropLat] DECIMAL(9,6) NOT NULL,
    [DropLng] DECIMAL(9,6) NOT NULL,
    [PickupCountry] LongText,
    [PickupRegion] LongText,
    [PickupCity] LongText,
    [PickupDistrict] LongText,
    [PickupPostalCode] LongText,
    [DropCountry] LongText,
    [DropRegion] LongText,
    [DropCity] LongText,
    [DropDistrict] LongText,
    [DropPostalCode] LongText,
    [CreatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] UtcStamp,
    [Status] NVARCHAR(100) NOT NULL DEFAULT('Pending'),
    [RideProfileId] UNIQUEIDENTIFIER NOT NULL,

    CONSTRAINT [CK_RideRequestLog_NumOfPeople] CHECK ([NumOfPeople] > 0),
    CONSTRAINT [CK_RideRequestLog_Operation] CHECK ([Operation] IN ('I','U','D')),
    CONSTRAINT [CK_RideRequestLog_Status] CHECK ([Status] IN ('Pending','Accepted','Declined','Cancelled','Completed','Edited'))
);

CREATE TABLE [dbo].[InAppMessage] (
    [MsgId] INT IDENTITY(1,1) NOT NULL,
    [SenderUserId] UNIQUEIDENTIFIER NOT NULL,
    [RecipientUserId] UNIQUEIDENTIFIER NOT NULL,
    [Body] NVARCHAR(MAX) NOT NULL,
    [SentAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [Ride] INT NOT NULL,
    CONSTRAINT [PK_InAppMessage] PRIMARY KEY CLUSTERED ([MsgId])
);

CREATE TABLE [dbo].[GdprLog] (
    [LogId] BIGINT IDENTITY(1,1) NOT NULL,
    [GdprId] INT NOT NULL,
    [ActorUserId] UNIQUEIDENTIFIER NOT NULL,
    [LoggedAt] UtcStamp,
    [Note] NVARCHAR(MAX),
    CONSTRAINT [PK_GdprLog] PRIMARY KEY CLUSTERED ([LogId])
);

CREATE TABLE [dbo].[CompanyRepresentative] (
    [CompanyRepresentativeId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [CompanyId] UNIQUEIDENTIFIER NOT NULL,
    [Email] LongText NOT NULL,
    [Username] NVARCHAR(30) NOT NULL UNIQUE,
    [PasswordHash] LongText NOT NULL,
    CONSTRAINT [PK_CompanyRepresentative] PRIMARY KEY CLUSTERED ([CompanyRepresentativeId])
);

CREATE TABLE [dbo].[Vehicle] (
    [VehicleId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [VehicleTypeId] INT NOT NULL,
    [Seats] INT DEFAULT 0 NOT NULL,
    [CargoVolume] DECIMAL(10,2) DEFAULT 0,
    [CargoWeight] DECIMAL(10,2) DEFAULT 0,
    [Status] NVARCHAR(100) DEFAULT 'Active',
    [UserOwnerPartyId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_Vehicle] PRIMARY KEY CLUSTERED ([VehicleId]),
    CONSTRAINT [CK_Seats_Positive] CHECK ([Seats] > 0),
    CONSTRAINT [CK_CargoWeight_Positive] CHECK ([CargoWeight] >= 0),
    CONSTRAINT [CK_CargoVolume_Positive] CHECK ([CargoVolume] >= 0),
    CONSTRAINT [CK_Vehicle_Status] CHECK ([Status] IN ('Active','Inactive'))
);

CREATE TABLE [dbo].[PersonDocument] (
    [DocId] INT IDENTITY(1,1) NOT NULL,
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    [DocType] NVARCHAR(100) NOT NULL,
    [IssueDate] UtcStamp NOT NULL ,
    [UploadedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [ExpiryDate] UtcStamp NOT NULL,
    [FileUrl] NVARCHAR(512) NOT NULL,
    CONSTRAINT [PK_PersonDocument] PRIMARY KEY CLUSTERED ([DocId]),
    CONSTRAINT [CK_PersonDocument_Expiry] CHECK ([ExpiryDate] > [IssueDate])
);

CREATE TABLE [dbo].[ItineraryLeg] (
    [LegId] INT IDENTITY(1,1) NOT NULL,
    [SeqNo] INT NOT NULL,
    [ViaBridgeId] INT,
    [RideRequestId] INT NOT NULL,
    CONSTRAINT [PK_ItineraryLeg] PRIMARY KEY CLUSTERED ([LegId]),
    CONSTRAINT [UQ_ItineraryLeg_SeqNo_RideRequest] UNIQUE ([SeqNo], [RideRequestId])
);

CREATE TABLE [dbo].[VehicleDocument] (
    [VehDocId] INT IDENTITY(1,1) NOT NULL,
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [DocType] NVARCHAR(100) NOT NULL,
    [IssueDate] UtcStamp NOT NULL,
    [UploadedAt] UtcStamp DEFAULT GETUTCDATE(),
    [ExpiryDate] UtcStamp NOT NULL,
    [FileUrl] NVARCHAR(512) NOT NULL,
    [Image] NVARCHAR(512) NOT NULL,
    CONSTRAINT [PK_VehicleDocument] PRIMARY KEY CLUSTERED ([VehDocId]),
    CONSTRAINT [CK_VehicleDocument_Expiry] CHECK ([ExpiryDate] > [IssueDate])
);

CREATE TABLE [dbo].[VehicleTest] (
    [TestId] UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [InspectorId] UNIQUEIDENTIFIER NOT NULL,
    [CheckDate] UtcStamp NOT NULL DEFAULT GETUTCDATE(),
    [ExpiryDate] AS (DATEADD(YEAR, 1, [CheckDate])),
    [Comments] NVARCHAR(MAX) DEFAULT N'No comments',
    CONSTRAINT [PK_VehicleTest] PRIMARY KEY CLUSTERED ([TestId])
);

CREATE TABLE [dbo].[UserServiceEnrollment] (
    [EnrollId] INT IDENTITY(1,1) NOT NULL,
    [Status] NVARCHAR(100),
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [ServiceType] INT NOT NULL,
    [RideType] INT NOT NULL,
    [ApprovedAt] UtcStamp,
    [ApprovedById] UNIQUEIDENTIFIER,
    [UserId] UNIQUEIDENTIFIER NOT NULL,
    CONSTRAINT [PK_UserServiceEnrollment] PRIMARY KEY CLUSTERED ([EnrollId]),
    CONSTRAINT [CK_UserServiceEnrollment_Status] CHECK ([Status] IN ('Pending','Approved','Rejected'))
);

CREATE TABLE dbo.[VehicleAvailabilityDaily] (
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [AvailabilityDate] DATE NOT NULL,
    [StartsAt] TIME(0) NOT NULL,
    [EndsAt] TIME(0) NOT NULL,
    [IsRecurring] BIT NOT NULL DEFAULT 0, -- repeated every weekday -> set to 1
    [UpdatedAt] UtcStamp DEFAULT GETUTCDATE(),
    CONSTRAINT PK_VehicleAvailabilityDaily PRIMARY KEY ([VehicleId], [AvailabilityDate]),
    CONSTRAINT CK_VAD_Time CHECK ([EndsAt] > [StartsAt])
);

CREATE TABLE [dbo].[DispatchOffer] (
    [OfferId] INT IDENTITY(1,1) NOT NULL,
    [LegId] INT NOT NULL,
    [RecipientPartyId] UNIQUEIDENTIFIER NOT NULL,
    [VehicleId] UNIQUEIDENTIFIER NOT NULL,
    [Status] NVARCHAR(100) NOT NULL DEFAULT 'Sent',
    [SentAt] UtcStamp DEFAULT GETUTCDATE(),
    [RespondedAt] UtcStamp,
    CONSTRAINT [PK_DispatchOffer] PRIMARY KEY CLUSTERED ([OfferId]),
    CONSTRAINT [CK_DispatchOffer_Status] CHECK ([Status] IN ('Sent','Accepted','Declined','Expired'))
);

CREATE TABLE [dbo].[VehicleLocationLive] (
    [VehicleId] UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    [Lat] DECIMAL(9,6) NOT NULL,
    [Lng] DECIMAL(9,6) NOT NULL,
    [UpdatedAt] UtcStamp NOT NULL DEFAULT GETUTCDATE()
);

CREATE TABLE [dbo].[LegCrossesBridge] (
    [ItineraryLeg] INT NOT NULL,
    [Bridge] INT NOT NULL,
    CONSTRAINT [PK_LegCrossesBridge] PRIMARY KEY CLUSTERED ([ItineraryLeg], [Bridge])
);

GO

-- =================================== FK and other constraints =================================== --

/* User -> Party */
ALTER TABLE [dbo].[User]
ADD CONSTRAINT [FK_User_Party]
    FOREIGN KEY ([PartyId]) REFERENCES [dbo].[Party]([PartyId])
    ON DELETE NO ACTION;

/* UserPreferences → User */
ALTER TABLE [dbo].[UserPreferences]
ADD CONSTRAINT [FK_UserPreferences_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE;

/* Operator → User, Admin */
ALTER TABLE [dbo].[Operator]
ADD CONSTRAINT [FK_Operator_ApprovedByAdmin]
    FOREIGN KEY ([ApprovedByAdmin]) REFERENCES [dbo].[Admin]([AdminId])
    ON DELETE NO ACTION;

/* Passenger → User, CreditCard */
ALTER TABLE [dbo].[Passenger]
ADD CONSTRAINT [FK_Passenger_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE

/* CreditCard → User (Owner) */
ALTER TABLE [dbo].[CreditCard]
ADD CONSTRAINT [FK_CreditCard_Party]
    FOREIGN KEY ([OwnerId]) REFERENCES [dbo].[Party]([PartyId])
    ON DELETE NO ACTION;

/* Company → CreditCard */
ALTER TABLE [dbo].[Company]
ADD CONSTRAINT [FK_Company_Party]
    FOREIGN KEY ([PartyId]) REFERENCES [dbo].[Party]([PartyId])
    ON DELETE NO ACTION;

/* Rating → User (author, target) */
ALTER TABLE [dbo].[Rating]
ADD CONSTRAINT [FK_Rating_AuthorUser]
    FOREIGN KEY ([AuthorUserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_Rating_TargetUser]
    FOREIGN KEY ([TargetUserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE NO ACTION,
    CONSTRAINT [CK_Rating_NoSelf]
    CHECK ([AuthorUserId] <> [TargetUserId]);

/* ServicetypeAllowedRidetype (junction) */
ALTER TABLE [dbo].[ServicetypeAllowedRidetype]
ADD CONSTRAINT [FK_SvcAllowedRide_Servicetype]
    FOREIGN KEY ([ServiceTypeID]) REFERENCES [dbo].[Servicetype]([ServiceTypeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_SvcAllowedRide_Ridetype]
    FOREIGN KEY ([RideTypeID]) REFERENCES [dbo].[Ridetype]([RideTypeId])
    ON DELETE CASCADE;

/* Driver → User, Company, CreditCard */
ALTER TABLE [dbo].[Driver]
ADD CONSTRAINT [FK_Driver_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Driver_Company]
    FOREIGN KEY ([Company]) REFERENCES [dbo].[Company]([CompanyId])
    ON DELETE CASCADE;

/* Vehicle → VehicleType, CompanyRepresentative, Driver */
ALTER TABLE [dbo].[Vehicle]
ADD CONSTRAINT [FK_Vehicle_VehicleType]
    FOREIGN KEY ([VehicleTypeId]) REFERENCES [dbo].[VehicleType]([VehicleTypeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Vehicle_User]
    FOREIGN KEY ([UserOwnerPartyId]) REFERENCES [dbo].[Party]([PartyId])
    ON DELETE CASCADE;

/* CompanyRepresentative → Company, User */
ALTER TABLE [dbo].[CompanyRepresentative]
ADD CONSTRAINT [FK_CompanyRepresentative_Company]
    FOREIGN KEY ([CompanyId]) REFERENCES [dbo].[Company]([CompanyId])
    ON DELETE CASCADE;

/* PersonDocument → User */
ALTER TABLE [dbo].[PersonDocument]
ADD CONSTRAINT [FK_PersonDocument_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
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
    ON DELETE CASCADE,
    CONSTRAINT [FK_VehicleTest_Inspector]
    FOREIGN KEY ([InspectorId]) REFERENCES [dbo].[Inspector]([InspectorId])
    ON DELETE NO ACTION;

/* VehicleAvailabilityDaily → Vehicle */
ALTER TABLE [dbo].[VehicleAvailabilityDaily]
ADD CONSTRAINT [FK_VehicleAvailability_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE CASCADE;

/* VehicleLocationLive → Vehicle */
ALTER TABLE [dbo].[VehicleLocationLive]
ADD CONSTRAINT [FK_VehicleLocationLive_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE CASCADE;

/* UserServiceEnrollment → Vehicle, ServiceType, RideType, Driver, Operator, CompanyRepresentative */
ALTER TABLE [dbo].[UserServiceEnrollment]
    ADD CONSTRAINT [FK_Enroll_User]
    FOREIGN KEY ([UserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_Enroll_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Enroll_ServiceType]
    FOREIGN KEY ([ServiceType]) REFERENCES [dbo].[Servicetype]([ServiceTypeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Enroll_RideType]
    FOREIGN KEY ([RideType]) REFERENCES [dbo].[Ridetype]([RideTypeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_Enroll_ApprovedByOperator]
    FOREIGN KEY ([ApprovedById]) REFERENCES [dbo].[Operator]([OperatorId])
    ON DELETE NO ACTION;

/* AllowedRideProfile → ServiceType, RideType, VehicleType */
ALTER TABLE [dbo].[AllowedRideProfile]
ADD CONSTRAINT [FK_AllowedRideProfile_ServiceType]
    FOREIGN KEY ([ServiceTypeId]) REFERENCES [dbo].[Servicetype]([ServiceTypeId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_AllowedRideProfile_RideType]
    FOREIGN KEY ([RideTypeId]) REFERENCES [dbo].[Ridetype]([RideTypeId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_AllowedRideProfile_VehicleType]
    FOREIGN KEY ([VehicleTypeId]) REFERENCES [dbo].[VehicleType]([VehicleTypeId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_AllowedRideProfile_ServicetypeAllowedRidetype]
    FOREIGN KEY ([ServiceTypeId], [RideTypeId]) REFERENCES [dbo].[ServicetypeAllowedRidetype]([ServiceTypeID], [RideTypeID])
    ON DELETE CASCADE;
    /* Bridge → Geofencezone */
    ALTER TABLE [dbo].[Bridge]
    ADD CONSTRAINT [FK_Bridge_FromZone]
    FOREIGN KEY ([FromZone]) REFERENCES [dbo].[Geofencezone]([ZoneId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_Bridge_ToZone]
    FOREIGN KEY ([ToZone]) REFERENCES [dbo].[Geofencezone]([ZoneId])
    ON DELETE NO ACTION;

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
    FOREIGN KEY ([PassengerId]) REFERENCES [dbo].[Passenger]([UserId])
    ON DELETE CASCADE;

/* RideRequestLog → RideRequest */
ALTER TABLE [dbo].[RideRequestLog]
ADD CONSTRAINT [FK_RideRequestLog_RideRequest]
    FOREIGN KEY ([RequestId]) REFERENCES [dbo].[RideRequest]([RequestId])
    ON DELETE NO ACTION;

/* DispatchOffer → ItineraryLeg, Driver, Company, Vehicle */
ALTER TABLE [dbo].[DispatchOffer]
ADD CONSTRAINT [FK_DispatchOffer_RecipientPartyId]
    FOREIGN KEY ([RecipientPartyId]) REFERENCES [dbo].[Party]([PartyId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_DispatchOffer_ItineraryLeg]
    FOREIGN KEY ([LegId]) REFERENCES [dbo].[ItineraryLeg]([LegId])
    ON DELETE CASCADE,
    CONSTRAINT [FK_DispatchOffer_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE NO ACTION;

/* Payment → Party (Sender, Receiver) */
ALTER TABLE [dbo].[Payment]
ADD CONSTRAINT [FK_Payment_SenderParty]
    FOREIGN KEY ([SenderPartyId]) REFERENCES [dbo].[Party]([PartyId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_Payment_ReceiverParty]
    FOREIGN KEY ([ReceiverPartyId]) REFERENCES [dbo].[Party]([PartyId])
    ON DELETE NO ACTION;

/* Ride → DispatchOffer, Rating, Payment */
ALTER TABLE [dbo].[Ride]
ADD CONSTRAINT [FK_Ride_DriverUser]
    FOREIGN KEY ([DriverUserId]) REFERENCES [dbo].[Party]([PartyId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_Ride_PassengerUser]
    FOREIGN KEY ([PassengerUserId]) REFERENCES [dbo].[Passenger]([UserId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_Ride_Vehicle]
    FOREIGN KEY ([VehicleId]) REFERENCES [dbo].[Vehicle]([VehicleId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_Ride_Offer]
    FOREIGN KEY ([OfferId]) REFERENCES [dbo].[DispatchOffer]([OfferId])
    ON DELETE NO ACTION,
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
    ON DELETE CASCADE,
    CONSTRAINT [FK_InAppMessage_SenderUser]
    FOREIGN KEY ([SenderUserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE NO ACTION,
    CONSTRAINT [FK_InAppMessage_RecipientUser]
    FOREIGN KEY ([RecipientUserId]) REFERENCES [dbo].[User]([UserId])
    ON DELETE NO ACTION;

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
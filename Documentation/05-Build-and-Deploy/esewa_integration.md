<https://developer.esewa.com.np/pages/Android#transactionflow>

    Introduction
    Epay
    Intent
    Android
        Transaction Flow
        System Interaction
        Integration
        Error Cases and Handling
        Transaction Verification
        Credentials & URLs
    iOS
    Flutter
    WooCommerce
    Prestashop
    Magento
    Token
    Test credentials
    Contact

Overview

The eSewa Mobile SDK enables native Android to easily accept eSewa payments. The SDK supports only one use case for making payment – Single Payment (i.e., one payment per one user login).
Transaction Flow

    1. Client Mobile Application initiates eSewa Payment procedure by sending their client_id and client_secret along with product/service name, product/service price, product_id, and callback-url to the SDK.

    2. SDK sends the merchant's credentials to eSewa.

    3. eSewa verifies the merchant credentials and sends a merchant authentication token upon successful verification.

    4. SDK sends customer credentials to eSewa.

    5. eSewa sends customer identifier along with name and balance to SDK.

    6. SDK sends payment request to eSewa if balance is sufficient for payment.

    7. In case of successful payment eSewa sends proof of payment to sdk and to client application server.

    8. SDK forwards proof of payment to client mobile application.

    9. Final verification procedure is strongly recommended before product/service delivery.

    10. Deliver Product/Service to customer.


                            client_id and client_secret values are provided by eSewa to its merchant/client and is unique for each. For development phase, you can use the following credentials:
 client_id: JB0BBQ4aD0UqIThFJwAKBgAXEUkEGQUBBAwdOgABHD4DChwUAB0R
client_secret: BhwIWQQADhIYSxILExMcAgFXFhcOBwAKBgAXEQ==

                            Note : After login, if the device stays ideal for more than 5 minutes before confirming the payment, the particular session will be time out and customer have to re-initiate the payment process.

                        
System Interaction

The interactions required to complete a transaction followed by transaction verification process are shown below:

Integration

Add SDK to your project

Clients can download the sdk (.aar file ) from this drive link. The .aar file must be added to libs folder of your projects app module (Your Project -> app -> libs ). After that add the following code in your apps build.gradle:

android{
...

repositories {
               flatDir {dirs ‘libs’}
             }
}

dependencies {
    compile(name: ‘eSewaSdk’, ext: ‘aar’)
    implementation "com.android.support:cardview-v7:27.1.1"
    implementation "com.android.support:design:27.1.1"
}

                            Note : eSewa SDK uses compileSdkVersion 27. So, compileSdkVersion 27 or higher must be used in the project.

                        
Add permissions to your Android Manifest.xml file

<uses-permission android:name=”android.permission.INTERNET” />
<uses-permission android:name=”android.permission.ACCESS_NETWORK_STATE” />

Create a ESewaConfiguration object

Create a ESewaConfiguration object. Start with test environment. When application is ready, you can switch it to live (ENVIRONMENT_PRODUCTION)

ESewaConfiguration eSewaConfiguration = new ESewaConfiguration()
        .clientId("<Client ID>")
        .secretKey("<Secret Key>")
        .environment(ESewaConfiguration.ENVIRONMENT_TEST);

Create the payment and launch the payment intent on some action done (for example when button is pressed)

  Button buttonBuy = (Button) findViewById(R.id.button_buy);
     buttonBuy.setOnClickListener(new View.OnClickListener() {

     @Override
     public void onClick(View view) {
        ESewaPayment eSewaPayment = new ESewaPayment(“<Product Price>”,             
        “<Product Name>”, “<productId>”,”<call_back_url>”);

        Intent intent = new Intent(SampleActivity.this, ESewaPaymentActivity.class);
        intent.putExtra(ESewaConfiguration.ESEWA_CONFIGURATION, eSewaConfiguration);

        intent.putExtra(ESewaPayment.ESEWA_PAYMENT, eSewaPayment);
        startActivityForResult(intent, REQUEST_CODE_PAYMENT);
    }
});

Where,
Parameter Name  Description
client_id
                                             Client Id of the client/merchant
Secret Key
                                             Secret key of the client/merchant
Environment
                                             Environment integrating for i.e. LIVE (live) or DEVELOPMENT (test)
Product Price
                                             Price of Product or Service
Product Name
                                             Name of Product or Service
ProductId
                                             Set a unique Id for your particular product or services
Callback-url
                                             API exposed at merchant/client`server where eSewa sends a copy of proof of payment after successful payment
Override onActivityResult() method to listen the results from the SDK

In this method, proof of payment in case of successful transaction and reason for failure in case of transaction failure ( In case of ( result == RESULT_CANCEL ) will be returned. No additional information will be sent on intent and in case of successful and unsuccessful payment proof of payment and reason of failure are sent respectively to string value Esewa-Payment.EXTRA_RESULT_MESSAGE).

@Override
  protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
     super.onActivityResult(requestCode, resultCode, data);
     if (requestCode == REQUEST_CODE_PAYMENT) {
         if (resultCode == Activity.RESULT_OK) {
             if (data == null) return;
             String message = data.getStringExtra(ESewaPayment.EXTRA_RESULT_MESSAGE);
             Log.i(TAG, "Proof of Payment " + message);
             Toast.makeText(this, "SUCCESSFUL PAYMENT", Toast.LENGTH_SHORT).show();
         } else if (resultCode == Activity.RESULT_CANCELED) {
             Toast.makeText(this, "Canceled By User", Toast.LENGTH_SHORT).show();
         } else if (resultCode == ESewaPayment.RESULT_EXTRAS_INVALID) {
             if (data == null) return;
             String message = data.getStringExtra(ESewaPayment.EXTRA_RESULT_MESSAGE);
             Log.i(TAG, "Proof of Payment " + message);
         }
     }
  }

Call Back Url

Callback-url is an API exposed at merchant/client's server at which eSewa sends a copy of proof of payment after successful payment; the client/merchant must send a callback-url while initiating the payment through SDK. The sent callback-url is later used by eSewa server to send a copy of proof of payment after a payment is received. The callback-url is a POST method API and should be in this format
Error Cases and Handling

Here are the error cases which can occur in each of the step during implementation of eSewa SDK implementation.
During Merchant Verification

    1. Invalid Merchant Id or Secret Key 
     SDK gets JSON response from server including errorMessage which contains message "Sorry your request failed. Contact your service provider." shown to customer and technicalErrorMessage which contains message "Invalid Merchant Credential" returned to merchant mobile application as along with result code EsewaPayment.RESULT_EXTRAS_INVALID. 

    2. No Internet Connection. 
     SDK shows dialog box with message  "Internet not available"  to end user and returns same message to mobile application as result.

    3. Invalid Test Environment 
     If environment of EsewaConfiguration is set to value other than ENVIRONMENT_TEST or ENVIRONMENT_PRODUCTION, SDK shows message "Sorry your request failed. Contact your service provider." to end user and message "Invalid Test Environment" which is returned to mobile application as result with result code EsewaPayment.RESULT_EXTRAS_INVALID.

During Customer Login

    1. No Internet Connection 
     SDK shows dialog box with message "Internet not available" to end user. 

    2. Invalid user name or password
     SDK shows message Invalid username or password to customer and clears password field.

    3. Canceled by customer 
     If end user presses Back Button or Cancel button then user is returned to previous mobile application's activity and result code RESULT_CANCELED is returned to mobile application.

During Payment Confirmation

    1. No Internet Connection 
     SDK shows dialog box with message "Internet not available" to customer. He can turn on Internet and proceed to confirming their payment.

    2. Insufficient Balance 
     SDK compares the customer's current balance with the total payment amount of the product or service. Payment request is sent if and only if the customer has sufficient balance else the following message will be shown “Your balance is less than required total amount” and will be bound to cancel the payment.

    3. Canceled by user 
     If customer presses Back Button or Cancel button then he is returned to previous merchant application's activity and result code RESULT_CANCELED is returned to mobile application.

    4. Session Timeout 
     If the device is kept untouched for 5 minutes then the particular session for payment expires and user has to re-process the payment again. Message "The session is expired. Please try again later" is shown to user and message “Session Time Out” which is returned to mobile application as result with result code EsewaPayment.RESULT_EXTRAS_INVALID.

Transaction Verification
VIA CALLBACK URL

Esewa sends a proof of payment in the callback-URL(if provided)after successful payment in live environment.
VIA TRANSACTION VERIFICATION API (Recommended Method)

In case of mobile devices, We suggest to use the TXN verification API using below methods to verify ur transaction status and check for “status” key in “transactionDetails” object from the response body. “status” => “COMPLETE” means the transaction verification is successful.You can use any methods as per your convenience
 For live enviromment, please remove 'rc' from url
Method 1: Using refID

<https://rc.esewa.com.np/mobile/transaction?txnRefId={refId}>

Method 2:Using productId and amount

<https://rc.esewa.com.np/mobile/transaction?productId={productId}&amount={amount}>

                            REQUEST TYPE : GET 
merchantId : ***********************************************
merchantSecret : ***********************************************
Content-Type : application/json

RESPONSE

[
    {
        "productId": "1999",
        "productName": "Android SDK Payment",
        "totalAmount": "25.0",
        "code": "00",
        "message": {
            "technicalSuccessMessage": "Your transaction has been completed.",
            "successMessage": "Your transaction has been completed."
        },
        "transactionDetails": {
            "date": "Mon Dec 26 12:58:14 NPT 2022",
            "referenceId": "0004VZR",
            "status": "COMPLETE"
        },
        "merchantName": "Android SDK Payment"
    }
]

Credentials & URLs

Each client will also receive a wallet on eSewa (Merchant wallet) from where they can find payments made for their products/services:

 Link For Production Mode: <https://merchant.esewa.com.np>

To make payment with eSewa sdk. One must be a registered eSewa user. For testing phase, the client/merchant can use the following eSewa id and password:

 eSewa ID: 9711111111/9711111112/9711111113/9711111114
 Password: Nepal@123 MPIN: 1122 (for application only)
Token:123456
 A GIT sample project with eSewa sdk integrated (java version) can be cloned from here
ABOUT ESEWA

eSewa is a mobile wallet for online and offline payments with a user base of 8 millions, a vast network of 4 hundred thousand agents, and a comprehensive array of services.
It is a one-stop destination for all of your needs like mobile recharge, electricity bills payment,telephone bills payment, booking bus and airlines tickets, buying movie tickets, transferring money, and many more.
COMPANY

    About Us
    Career
    Partner Banks
    Contact us
    FAQ

POLICIES

    Privacy Policy
    Terms & Conditions
    Report Fraud & Misuse
    Transaction Limits

DOWNLOAD APP
© 2009- 2026 eSewa.All Rights Reserved.
keep in touch----

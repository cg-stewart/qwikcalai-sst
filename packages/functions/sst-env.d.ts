/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */
import "sst"
export {}
declare module "sst" {
  export interface Resource {
    "Billing": {
      "arn": string
      "type": "sst.aws.SnsTopic"
    }
    "BillingQueue": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "EmailDLQ": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "EmailDelivery": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "EmailService": {
      "configSet": string
      "sender": string
      "type": "sst.aws.Email"
    }
    "EventProcessing": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "EventProcessingDLQ": {
      "type": "sst.aws.Queue"
      "url": string
    }
    "Events": {
      "name": string
      "type": "sst.aws.Dynamo"
    }
    "ImageProcessing": {
      "arn": string
      "type": "sst.aws.SnsTopic"
    }
    "Notifications": {
      "arn": string
      "type": "sst.aws.SnsTopic"
    }
    "OpenAIKey": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "QwikCalAI": {
      "type": "sst.aws.Nextjs"
      "url": string
    }
    "QwikCalApi": {
      "type": "sst.aws.ApiGatewayV2"
      "url": string
    }
    "QwikCalIdentityPool": {
      "id": string
      "type": "sst.aws.CognitoIdentityPool"
    }
    "QwikCalUserPool": {
      "id": string
      "type": "sst.aws.CognitoUserPool"
    }
    "QwikCalUserPoolClient": {
      "id": string
      "secret": string
      "type": "sst.aws.CognitoUserPoolClient"
    }
    "StripeSecretKey": {
      "type": "sst.sst.Secret"
      "value": string
    }
    "Uploads": {
      "name": string
      "type": "sst.aws.Bucket"
    }
    "Users": {
      "name": string
      "type": "sst.aws.Dynamo"
    }
  }
}

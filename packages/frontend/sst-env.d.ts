/* This file is auto-generated by SST. Do not edit. */
/* tslint:disable */
/* eslint-disable */
/* deno-fmt-ignore-file */
import "sst"
export {}
declare module "sst" {
  export interface Resource {
    "Events": {
      "name": string
      "type": "sst.aws.Dynamo"
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

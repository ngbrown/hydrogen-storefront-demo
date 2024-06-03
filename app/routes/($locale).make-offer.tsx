import {Await, type MetaFunction} from '@remix-run/react';
import {Suspense} from 'react';
import type {CartQueryDataReturn} from '@shopify/hydrogen';
import {json, type ActionFunctionArgs} from '@shopify/remix-oxygen';
import {useRootLoaderData} from '~/lib/root-data';
import {MakeOfferForm} from '~/components/MakeOfferForm';

export const meta: MetaFunction = () => {
  return [{title: `Hydrogen | Cart`}];
};

export async function action({request, context}: ActionFunctionArgs) {
  const {env, storefront} = context;
  const formData = await request.formData();

  const {action, inputs} = MakeOfferForm.getFormInput(formData);

  if (!action) {
    throw new Error('No action provided');
  }

  let status = 200;
  let result: CartQueryDataReturn;

  switch (action) {
    case MakeOfferForm.ACTIONS.SubmitOffer: {
      // Get product information from backend instead of trusting submitted data
      const {product} = await storefront.query(PRODUCT_QUERY, {
        variables: {
          id: inputs.productId,
          selectedOptions: inputs.selectedOptions,
        },
      });

      const offerPrice = inputs.offerPrice;
      const request = {
        customerEmail: inputs.email,
        productTitle: product.title,
        priceAtBidTime: (
          Number.parseFloat(product.selectedVariant.price.amount) * 100
        ).toString(),
        bidPrice: Number.parseFloat(offerPrice) * 100,
        shop: env.PUBLIC_STOREFRONT_ID,
        productId: inputs.productId.replace('gid://shopify/Product/', ''),
        productVariantId: inputs.productVariantId.replace(
          'gid://shopify/ProductVariant/',
          '',
        ),
        productHandle: product.handle,
      };

      console.log(JSON.stringify(request, null, 2));

      if (inputs.productVariantId !== product.selectedVariant.id) {
        throw new Error(`productVariantId does not match selected options`);
      }

      const wishlyBidUrl = `http://${env.PUBLIC_STORE_DOMAIN}/apps/wishly/bid`;
      console.log(`posting to ${wishlyBidUrl}`);

      const response = await fetch(wishlyBidUrl, {
        headers: {
          'content-type': 'application/json',
          cookie: `storefront_digest=${env.PROTECTED_STORE_DIGEST_COOKIE}`,
        },
        method: 'POST',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error('Response to make an offer backend not ok');
      }
      break;
    }
    default:
      throw new Error(`${action} make offer action is not defined`);
  }

  const headers = new Headers();

  const redirectTo = formData.get('redirectTo') ?? null;
  if (typeof redirectTo === 'string') {
    status = 303;
    headers.set('Location', redirectTo);
  }

  headers.append('Set-Cookie', await context.session.commit());

  return json({}, {status, headers});
}

const PRODUCT_VARIANT_FRAGMENT = `#graphql
  fragment ProductVariantMakeOffer on ProductVariant {
    availableForSale
    compareAtPrice {
      amount
      currencyCode
    }
    id
    price {
      amount
      currencyCode
    }
    selectedOptions {
      name
      value
    }
    title
    unitPrice {
      amount
      currencyCode
    }
  }
` as const;

const PRODUCT_FRAGMENT = `#graphql
  fragment ProductMakeOffer on Product {
    id
    title
    handle
    selectedVariant: variantBySelectedOptions(selectedOptions: $selectedOptions, ignoreUnknownOptions: true, caseInsensitiveMatch: true) {
      ...ProductVariantMakeOffer
    }
  }
  ${PRODUCT_VARIANT_FRAGMENT}
` as const;

const PRODUCT_QUERY = `#graphql
  query ProductMakeOffer(
    $country: CountryCode
    $id: ID!
    $language: LanguageCode
    $selectedOptions: [SelectedOptionInput!]!
  ) @inContext(country: $country, language: $language) {
    product(id: $id) {
      ...ProductMakeOffer
    }
  }
  ${PRODUCT_FRAGMENT}
` as const;

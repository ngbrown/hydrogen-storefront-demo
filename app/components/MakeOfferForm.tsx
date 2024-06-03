import {useFetcher, type FetcherWithComponents} from '@remix-run/react';
import type {SelectedOption} from '@shopify/hydrogen/storefront-api-types';
import type {ReactNode, JSX} from 'react';

type OtherFormData = {
  [key: string]: unknown;
};

export interface MakeOfferActionInput {
  action: 'SubmitOffer';
  inputs: {
    productId: string;
    productVariantId: string;
    selectedOptions: Pick<SelectedOption, 'name' | 'value'>[];
  } & OtherFormData;
}

interface MakeOfferFormProps {
  /**
   * Children nodes of MakeOfferForm.
   * Children can be a render prop that receives the fetcher.
   */
  children: ReactNode | ((fetcher: FetcherWithComponents<any>) => ReactNode);
  /**
   * The route to submit the form to. Defaults to the current route.
   */
  route?: string;
  /**
   * Optional key to use for the fetcher.
   * @see https://remix.run/hooks/use-fetcher#key
   */
  fetcherKey?: string;

  action: 'SubmitOffer';

  inputs: {
    productId: string;
    productVariantId: string;
    selectedOptions: Pick<SelectedOption, 'name' | 'value'>[];
  };
}

const INPUT_NAME = 'makeOfferFormInput';

export function MakeOfferForm({
  children,
  action,
  inputs,
  route,
  fetcherKey,
}: MakeOfferFormProps): JSX.Element {
  const fetcher = useFetcher({key: fetcherKey});

  return (
    <fetcher.Form action={route || ''} method="post">
      {(action || inputs) && (
        <input
          type="hidden"
          name={INPUT_NAME}
          value={JSON.stringify({action, inputs})}
        />
      )}
      {typeof children === 'function' ? children(fetcher) : children}
    </fetcher.Form>
  );
}
MakeOfferForm.INPUT_NAME = INPUT_NAME;
MakeOfferForm.ACTIONS = {
  SubmitOffer: 'SubmitOffer',
} as const;

export function getFormInput(formData: FormData): MakeOfferActionInput {
  const data: Record<string, unknown> = {};
  for (const pair of formData.entries()) {
    const key = pair[0];
    const values = formData.getAll(key);

    data[key] = values.length > 1 ? values : pair[1];
  }

  // Parse makeOfferFormInput (INPUT_NAME)
  const {makeOfferFormInput, ...otherData} = data;
  const {action, inputs}: MakeOfferActionInput = makeOfferFormInput
    ? JSON.parse(String(makeOfferFormInput))
    : {};
  return {
    action,
    inputs: {
      ...inputs,
      ...otherData,
    },
  } as unknown as MakeOfferActionInput;
}

MakeOfferForm.getFormInput = getFormInput;

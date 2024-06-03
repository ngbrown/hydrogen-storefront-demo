import {Await} from '@remix-run/react';
import {Suspense, useState} from 'react';
import type {
  CartApiQueryFragment,
  FooterQuery,
  HeaderQuery,
} from 'storefrontapi.generated';
import {Aside} from '~/components/Aside';
import {Footer} from '~/components/Footer';
import {Header, HeaderMenu} from '~/components/Header';
import {CartMain} from '~/components/Cart';
import {
  PredictiveSearchForm,
  PredictiveSearchResults,
} from '~/components/Search';
import {MakeOfferForm} from './MakeOfferForm';

export type LayoutProps = {
  cart: Promise<CartApiQueryFragment | null>;
  children?: React.ReactNode;
  footer: Promise<FooterQuery>;
  header: HeaderQuery;
  isLoggedIn: Promise<boolean>;
};

export function Layout({
  cart,
  children = null,
  footer,
  header,
  isLoggedIn,
}: LayoutProps) {
  return (
    <>
      <CartAside cart={cart} />
      <SearchAside />
      <MobileMenuAside menu={header?.menu} shop={header?.shop} />
      <MakeOfferAside />
      {header && <Header header={header} cart={cart} isLoggedIn={isLoggedIn} />}
      <main>{children}</main>
      <Suspense>
        <Await resolve={footer}>
          {(footer) => <Footer menu={footer?.menu} shop={header?.shop} />}
        </Await>
      </Suspense>
    </>
  );
}

function CartAside({cart}: {cart: LayoutProps['cart']}) {
  return (
    <Aside id="cart-aside" heading="CART">
      <Suspense fallback={<p>Loading cart ...</p>}>
        <Await resolve={cart}>
          {(cart) => {
            return <CartMain cart={cart} layout="aside" />;
          }}
        </Await>
      </Suspense>
    </Aside>
  );
}

function SearchAside() {
  return (
    <Aside id="search-aside" heading="SEARCH">
      <div className="predictive-search">
        <br />
        <PredictiveSearchForm>
          {({fetchResults, inputRef}) => (
            <div>
              <input
                name="q"
                onChange={fetchResults}
                onFocus={fetchResults}
                placeholder="Search"
                ref={inputRef}
                type="search"
              />
              &nbsp;
              <button
                onClick={() => {
                  window.location.href = inputRef?.current?.value
                    ? `/search?q=${inputRef.current.value}`
                    : `/search`;
                }}
              >
                Search
              </button>
            </div>
          )}
        </PredictiveSearchForm>
        <PredictiveSearchResults />
      </div>
    </Aside>
  );
}

function MobileMenuAside({
  menu,
  shop,
}: {
  menu: HeaderQuery['menu'];
  shop: HeaderQuery['shop'];
}) {
  return (
    menu &&
    shop?.primaryDomain?.url && (
      <Aside id="mobile-menu-aside" heading="MENU">
        <HeaderMenu
          menu={menu}
          viewport="mobile"
          primaryDomainUrl={shop.primaryDomain.url}
        />
      </Aside>
    )
  );
}

function MakeOfferAside() {
  const state = typeof window === 'object' ? window.history.state : null;
  const priceAtBidTimeAmount =
    state?.priceAtBidTime != null ? Number(state.priceAtBidTime.amount) : 0.0;
  const isValidState =
    state != null &&
    priceAtBidTimeAmount > 0 &&
    state.productId != null &&
    state.productVariantId != null &&
    state.productTitle != null &&
    state.selectedOptions != null;
  const key = isValidState
    ? `${state.productId}:${state.productVariantId}`
    : undefined;
  return (
    <Aside id="make-offer-aside" heading="MAKE-OFFER">
      <div className="make-offer">
        {isValidState ? (
          <MakeOfferForm
            route="/make-offer"
            action="SubmitOffer"
            inputs={{
              productId: state.productId,
              productVariantId: state.productVariantId,
              selectedOptions: state.selectedOptions,
            }}
            fetcherKey={key}
          >
            {(fetcher) =>
              fetcher.data ? (
                <>
                  <h1>Congrats!</h1>
                  <p>Your offer has been submitted successfully!</p>
                </>
              ) : (
                <>
                  <MakeOfferDisplay
                    key={key}
                    fetcherState={fetcher.state}
                    priceAtBidTimeAmount={priceAtBidTimeAmount}
                    productTitle={state.productTitle}
                  />
                  <div style={{display: 'none'}}>{JSON.stringify(state)}</div>
                </>
              )
            }
          </MakeOfferForm>
        ) : null}
      </div>
    </Aside>
  );
}

function MakeOfferDisplay({
  fetcherState,
  priceAtBidTimeAmount,
  productTitle,
}: {
  fetcherState: 'idle' | 'loading' | 'submitting';
  priceAtBidTimeAmount: number;
  productTitle: string;
}) {
  const [offerPrice, setOfferPrice] = useState(
    Math.round(priceAtBidTimeAmount * 0.75),
  );

  return (
    <>
      <div>
        ${offerPrice}{' '}
        <span style={{textDecoration: 'line-through', color: 'red'}}>
          ${priceAtBidTimeAmount}
        </span>
      </div>
      <fieldset style={{borderWidth: 0}}>
        <label htmlFor="offerPrice">Offer Price</label>
        <input
          aria-label="Offer Price"
          value={offerPrice}
          max={priceAtBidTimeAmount}
          min={Math.round(priceAtBidTimeAmount * 0.5)}
          step={1.0}
          id="offerPrice"
          name="offerPrice"
          required
          type="range"
          onChange={(e) => setOfferPrice(Number(e.target.value))}
        ></input>
        <label htmlFor="email">Email*</label>
        <input
          aria-label="Email"
          autoComplete="email"
          id="email"
          name="email"
          placeholder="Enter email to be notified if accepted"
          required
          type="email"
        ></input>
      </fieldset>
      <button type="submit" disabled={fetcherState !== 'idle'}>
        Submit your offer
      </button>
      <p>
        Make an offer for the <em>{productTitle}</em>. If we can offer this
        discount, we will send you an email with a link to our checkout page.
      </p>
    </>
  );
}

import React, { useCallback, useEffect, useState } from 'react'
import { Button } from './ui/button'
import { PlaidLinkOnSuccess, PlaidLinkOptions, usePlaidLink } from 'react-plaid-link'
import { useRouter } from 'next/navigation';
import { createLinkToken, exchangePublicToken } from '@/lib/actions/user.actions';
import Image from 'next/image';

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const router = useRouter();

  const [token, setToken] = useState('');

  useEffect(() => {
    const getLinkToken = async () => {
      const data = await createLinkToken(user);
      if (data?.linkToken) {
        setToken(data.linkToken);
      } else {
        console.error("Failed to fetch link token");
      }
    };

    getLinkToken();
  }, [user]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token: string) => {
    try {
      const result = await exchangePublicToken({
        publicToken: public_token,
        user,
      });
      if (result) {
        console.log("Successfully exchanged public token:", result);
        router.push('/');
      } else {
        console.error("Failed to exchange public token");
      }
    } catch (error) {
      console.error("Error in onSuccess callback:", error);
    }
  }, [user, router]);

  const config: PlaidLinkOptions = {
    token,
    onSuccess,
    // Explicitly specify the products to ensure consent is requested
    env: 'sandbox', // Ensure we're using the sandbox environment
  };

  const { open, ready, error } = usePlaidLink(config);

  useEffect(() => {
    if (error) {
      console.error("Plaid Link error:", error);
    }
  }, [error]);

  return (
    <>
      {variant === 'primary' ? (
        <Button
          onClick={() => open()}
          disabled={!ready}
          className="plaidlink-primary shadow-none"
        >
          Connect bank
        </Button>
      ): variant === 'ghost' ? (
        <Button onClick={() => open()} variant="ghost" className="plaidlink-ghost shadow-none">
          <Image 
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className='hiddenl text-[16px] font-semibold text-black-2 xl:block'>Connect bank</p>
        </Button>
      ): (
        <Button onClick={() => open()} className="plaidlink-default shadow-none">
          <Image 
            src="/icons/connect-bank.svg"
            alt="connect bank"
            width={24}
            height={24}
          />
          <p className='text-[16px] font-semibold text-black-2'>Connect bank</p>
        </Button>
      )}
    </>
  )
}

export default PlaidLink
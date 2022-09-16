import { TransactionResponse } from '@ethersproject/providers'
import { useChainId, usePngSymbol } from 'src/hooks'
import { useMerkledropContract } from '../../hooks/useContract'
import { calculateGasMargin, waitForTransaction } from '../../utils'
import { useTransactionAdder } from '../transactions/hooks'
import { TokenAmount } from '@pangolindex/sdk'
import { PNG } from '../../constants/tokens'
import { useSingleCallResult } from '../multicall/hooks'
import { useLibrary } from '@pangolindex/components'
import { MERKLEDROP_ADDRESS, ZERO_ADDRESS } from 'src/constants'
import { useQuery } from 'react-query'
import axios from 'axios'
import { useMemo, useState } from 'react'

export function useMerkledropClaimedAmounts(account: string | null | undefined, airdropAddress?: string) {
  const chainId = useChainId()
  const merkledropContract = useMerkledropContract(airdropAddress)
  const claimedAmountsState = useSingleCallResult(merkledropContract, 'claimedAmounts', [account ?? ZERO_ADDRESS])

  return useMemo(() => {
    if (!account) {
      return new TokenAmount(PNG[chainId], '0')
    }
    return new TokenAmount(PNG[chainId], claimedAmountsState.result?.[0]?.toString() || '0')
  }, [chainId, account, claimedAmountsState])
}

export function useMerkledropProof(account: string | null | undefined, airdropAddress?: string) {
  const chainId = useChainId()
  return useQuery(
    ['MerkledropProof', account, chainId],
    async () => {
      if (!account)
        return {
          amount: new TokenAmount(PNG[chainId], '0'),
          proof: [],
          root: ''
        }

      const airdropContractAddress = airdropAddress || MERKLEDROP_ADDRESS[chainId] || ''
      try {
        const response = await axios.get(
          `https://static.pangolin.exchange/merkle-drop/${chainId}/${airdropContractAddress.toLocaleLowerCase()}/${account.toLocaleLowerCase()}.json`
        )
        if (response.status !== 200) {
          return {
            amount: new TokenAmount(PNG[chainId], '0'),
            proof: [],
            root: ''
          }
        }
        const data = response.data
        return {
          amount: new TokenAmount(PNG[chainId], data.amount),
          proof: data.proof as string[],
          root: data.root as string
        }
      } catch (error) {
        return {
          amount: new TokenAmount(PNG[chainId], '0'),
          proof: [],
          root: ''
        }
      }
    },
    {
      cacheTime: 1000 * 60 * 60 * 1, // 1 hour
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 60 * 1 // 1 hour
    }
  )
}

export function useClaimAirdrop(account: string | null | undefined, airdropAddress?: string) {
  const { library, provider } = useLibrary()
  const pngSymbol = usePngSymbol()

  const merkledropContract = useMerkledropContract(airdropAddress)
  const { data } = useMerkledropProof(account, airdropAddress)

  const [hash, setHash] = useState<string | null>(null)
  const [attempting, setAttempting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const addTransaction = useTransactionAdder()

  const onDimiss = () => {
    setHash(null)
    setAttempting(false)
    setError(null)
  }

  const onClaim = async () => {
    if (!merkledropContract || !data || data.proof.length === 0 || !account) return
    setAttempting(true)
    try {
      const message =
        'By signing this transaction, I hereby acknowledge that I am not a US resident or citizen. (Citizens or residents of the United States of America are not allowed to the PSB token airdrop due to applicable law.)'

      const signature = await provider?.request({
        method: 'personal_sign',
        params: [message, account]
      })

      const estimedGas = await merkledropContract.estimateGas.claim(data.amount.raw.toString(), data.proof, signature)
      const response: TransactionResponse = await merkledropContract.claim(
        data.amount.raw.toString(),
        data.proof,
        signature,
        {
          gasLimit: calculateGasMargin(estimedGas)
        }
      )
      await waitForTransaction(library, response, 5)

      addTransaction(response, {
        summary: `Claimed ${pngSymbol} and deposited in the SAR`,
        claim: { recipient: account }
      })
      setHash(response.hash)
    } catch (err) {
      // we only care if the error is something _other_ than the user rejected the tx
      const _err = err as any
      if (_err?.code !== 4001) {
        console.error(_err)
        setError(_err.message)
      }
    } finally {
      setAttempting(false)
    }
  }

  return { onClaim, onDimiss, hash, attempting, error }
}

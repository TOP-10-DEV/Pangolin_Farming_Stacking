import React, { useState } from 'react'
import Modal from '../Modal'
import { AutoColumn } from '../Column'
import styled from 'styled-components'
import { RowBetween } from '../Row'
import { TYPE, CloseIcon } from '../../theme'
import { ButtonError } from '../Button'
import { DoubleSideStakingInfo, MiniChefStakingInfos, useMinichefPools } from '../../state/stake/hooks'
import { useMiniChefContract, useStakingContract } from '../../hooks/useContract'
import { SubmittedView, LoadingView } from '../ModalViews'
import { TransactionResponse } from '@ethersproject/providers'
import { useTransactionAdder } from '../../state/transactions/hooks'
import FormattedCurrencyAmount from '../FormattedCurrencyAmount'
import { useActiveWeb3React } from '../../hooks'
import { useTranslation } from 'react-i18next'

const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

interface StakingModalProps {
  isOpen: boolean
  onDismiss: () => void
  stakingInfo: DoubleSideStakingInfo
  miniChefStaking?: MiniChefStakingInfos
  pairAddress?: string
}

export default function UnstakingModal({
  isOpen,
  onDismiss,
  stakingInfo,
  miniChefStaking,
  pairAddress
}: StakingModalProps) {
  const { account } = useActiveWeb3React()
  const { t } = useTranslation()

  // monitor call to help UI loading state
  const addTransaction = useTransactionAdder()
  const [hash, setHash] = useState<string | undefined>()
  const [attempting, setAttempting] = useState(false)

  function wrappedOndismiss() {
    setHash(undefined)
    setAttempting(false)
    onDismiss()
  }

  // @ts-ignore
  const stakingContract = useStakingContract(stakingInfo.stakingRewardAddress)

  const miniChefContract = useMiniChefContract()
  const poolMap = useMinichefPools()

  async function onWithdraw() {
    if (miniChefContract && miniChefStaking?.stakedAmount && pairAddress) {
      setAttempting(true)
      await miniChefContract
        .withdrawAndHarvest(poolMap[pairAddress], `0x${miniChefStaking?.stakedAmount?.raw.toString(16)}`, account)
        .then((response: TransactionResponse) => {
          addTransaction(response, {
            summary: t('earn.withdrawDepositedLiquidity')
          })
          setHash(response.hash)
        })
        .catch((error: any) => {
          setAttempting(false)
          console.log(error)
        })
    }
  }

  let error: string | undefined
  if (!account) {
    error = t('earn.connectWallet')
  }
  if (!miniChefStaking?.stakedAmount) {
    error = error ?? t('earn.enterAmount')
  }

  return (
    <Modal isOpen={isOpen} onDismiss={wrappedOndismiss} maxHeight={90}>
      {!attempting && !hash && (
        <ContentWrapper gap="lg">
          <RowBetween>
            <TYPE.mediumHeader>Withdraw</TYPE.mediumHeader>
            <CloseIcon onClick={wrappedOndismiss} />
          </RowBetween>
          {miniChefStaking?.stakedAmount && (
            <AutoColumn justify="center" gap="md">
              <TYPE.body fontWeight={600} fontSize={36}>
                {<FormattedCurrencyAmount currencyAmount={miniChefStaking.stakedAmount} />}
              </TYPE.body>
              <TYPE.body>{t('earn.depositedPglLiquidity')}</TYPE.body>
            </AutoColumn>
          )}
          {miniChefStaking?.earnedAmount && (
            <AutoColumn justify="center" gap="md">
              <TYPE.body fontWeight={600} fontSize={36}>
                {<FormattedCurrencyAmount currencyAmount={miniChefStaking?.earnedAmount} />}
              </TYPE.body>
              <TYPE.body>{t('earn.unclaimedReward', { symbol: 'PNG' })}</TYPE.body>
            </AutoColumn>
          )}
          <TYPE.subHeader style={{ textAlign: 'center' }}>{t('earn.whenYouWithdrawWarning')}</TYPE.subHeader>
          <ButtonError disabled={!!error} error={!!error && !!miniChefStaking?.stakedAmount} onClick={onWithdraw}>
            {error ?? t('earn.withdrawAndClaim')}
          </ButtonError>
        </ContentWrapper>
      )}
      {attempting && !hash && (
        <LoadingView onDismiss={wrappedOndismiss}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.body fontSize={20}>
              {t('earn.withdrawingLiquidity', {
                amount: miniChefStaking?.stakedAmount?.toSignificant(4),
                symbol: 'PGL'
              })}
            </TYPE.body>
            <TYPE.body fontSize={20}>
              {t('earn.claimingReward', {
                amount: miniChefStaking?.earnedAmount?.toSignificant(4),
                symbol: 'PNG'
              })}
            </TYPE.body>
          </AutoColumn>
        </LoadingView>
      )}
      {hash && (
        <SubmittedView onDismiss={wrappedOndismiss} hash={hash}>
          <AutoColumn gap="12px" justify={'center'}>
            <TYPE.largeHeader>{t('earn.transactionSubmitted')}</TYPE.largeHeader>
            <TYPE.body fontSize={20}>{t('earn.withdrewStakingToken', { symbol: 'PGL' })}</TYPE.body>
            <TYPE.body fontSize={20}>{t('earn.claimedReward', { symbol: 'PNG' })}</TYPE.body>
          </AutoColumn>
        </SubmittedView>
      )}
    </Modal>
  )
}

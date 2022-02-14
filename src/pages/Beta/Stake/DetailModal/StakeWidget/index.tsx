import React, { useState, useCallback } from 'react'
import { PNG, ZERO_ADDRESS } from 'src/constants'
import UnstakeDrawer from '../UnstakeDrawer'
import { Root, Buttons, UnstakeButton, MaxButton, Balance, PendingWrapper, StakeWrapper, GridContainer } from './styled'
import { BETA_MENU_LINK } from 'src/constants'
import { Box, Button, Text, TextInput, Steps, Step } from '@pangolindex/components'
import useTransactionDeadline from 'src/hooks/useTransactionDeadline'
import { TokenAmount, JSBI, ChainId } from '@pangolindex/sdk'
import { useActiveWeb3React } from 'src/hooks'
import { maxAmountSpend } from 'src/utils/maxAmountSpend'
import { usePngContract, useStakingContract } from 'src/hooks/useContract'
import { useApproveCallback, ApprovalState } from 'src/hooks/useApproveCallback'
import { SingleSideStakingInfo, useDerivedStakeInfo } from 'src/state/stake/hooks'
import { wrappedCurrencyAmount } from 'src/utils/wrappedCurrency'
import { TransactionResponse } from '@ethersproject/providers'
import { useTransactionAdder } from 'src/state/transactions/hooks'
import { useTranslation } from 'react-i18next'
import { splitSignature } from 'ethers/lib/utils'
import TransactionCompleted from 'src/components/Beta/TransactionCompleted'
import { useTokenBalance } from 'src/state/wallet/hooks'
import Stat from 'src/components/Stat'
import Loader from 'src/components/Beta/Loader'
import useUSDCPrice from 'src/utils/useUSDCPrice'

type Props = {
  stakingInfo: SingleSideStakingInfo
}

const StakeWidget: React.FC<Props> = ({ stakingInfo }) => {
  const { t } = useTranslation()
  const { account, chainId, library } = useActiveWeb3React()
  const [isUnstakeDrawerVisible, setShowUnstakeDrawer] = useState(false)
  // const [isDepositDrawerVisible, setShowDepositDrawer] = useState(false)

  const png = PNG[chainId ? chainId : ChainId.AVALANCHE]

  const usdcPrice = useUSDCPrice(png)

  // detect existing unstaked position to show purchase button if none found
  const userPngUnstaked = useTokenBalance(account ?? undefined, stakingInfo?.stakedAmount?.token)

  const stakeToken = stakingInfo?.stakedAmount?.token?.symbol

  const [stepIndex, setStepIndex] = useState(4)

  // track and parse user input
  const [typedValue, setTypedValue] = useState((userPngUnstaked as TokenAmount)?.toExact() || '')
  const { parsedAmount, error } = useDerivedStakeInfo(typedValue, stakingInfo.stakedAmount.token, userPngUnstaked)
  const parsedAmountWrapped = wrappedCurrencyAmount(parsedAmount, chainId)

  let hypotheticalRewardRate: TokenAmount = new TokenAmount(stakingInfo.rewardRate.token, '0')
  if (parsedAmountWrapped?.greaterThan('0')) {
    hypotheticalRewardRate = stakingInfo.getHypotheticalRewardRate(
      stakingInfo.stakedAmount.add(parsedAmountWrapped),
      stakingInfo.totalStakedAmount.add(parsedAmountWrapped),
      stakingInfo.totalRewardRate
    )
  }

  const dollerWorth =
    userPngUnstaked?.greaterThan('0') && usdcPrice ? Number(typedValue) * Number(usdcPrice.toFixed()) : undefined

  // state for pending and submitted txn views
  const addTransaction = useTransactionAdder()
  const [attempting, setAttempting] = useState<boolean>(false)
  const [hash, setHash] = useState<string | undefined>()
  const wrappedOnDismiss = useCallback(() => {
    setHash(undefined)
    setAttempting(false)
  }, [])

  const stakingTokenContract = usePngContract()

  // approval data for stake
  const deadline = useTransactionDeadline()
  const [signatureData, setSignatureData] = useState<{ v: number; r: string; s: string; deadline: number } | null>(null)
  const [approval, approveCallback] = useApproveCallback(parsedAmount, stakingInfo.stakingRewardAddress)

  const stakingContract = useStakingContract(stakingInfo.stakingRewardAddress)

  async function onStake() {
    setAttempting(true)
    if (stakingContract && parsedAmount && deadline) {
      if (approval === ApprovalState.APPROVED) {
        stakingContract
          .stake(`0x${parsedAmount.raw.toString(16)}`)
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              summary: t('earnPage.stakeStakingTokens', { symbol: 'PNG' })
            })
            setHash(response.hash)
          })
          .catch((error: any) => {
            setAttempting(false)
            console.error(error)
          })
      } else if (signatureData) {
        stakingContract
          .stakeWithPermit(
            `0x${parsedAmount.raw.toString(16)}`,
            signatureData.deadline,
            signatureData.v,
            signatureData.r,
            signatureData.s
          )
          .then((response: TransactionResponse) => {
            addTransaction(response, {
              summary: t('earnPage.stakeStakingTokens', { symbol: 'PNG' })
            })
            setHash(response.hash)
          })
          .catch((error: any) => {
            setAttempting(false)
            console.error(error)
          })
      } else {
        setAttempting(false)
        throw new Error(t('earn.attemptingToStakeError'))
      }
    }
  }

  const onChangeDot = (value: number) => {
    setStepIndex(value)
    if (!userPngUnstaked) {
      setTypedValue('0')
      return
    }
    if (value === 4) {
      setTypedValue((userPngUnstaked as TokenAmount).toExact())
    } else {
      const newAmount = (userPngUnstaked as TokenAmount)
        .multiply(JSBI.BigInt(value * 25))
        .divide(JSBI.BigInt(100)) as TokenAmount
      setTypedValue(newAmount.toSignificant(6))
    }
  }

  // wrapped onUserInput to clear signatures
  const onUserInput = useCallback((typedValue: string) => {
    setSignatureData(null)
    setTypedValue(typedValue)
  }, [])

  // used for max input button
  const maxAmountInput = maxAmountSpend(userPngUnstaked)
  // const atMaxAmount = Boolean(maxAmountInput && parsedAmount?.equalTo(maxAmountInput))
  const handleMax = useCallback(() => {
    maxAmountInput && onUserInput(maxAmountInput.toExact())
    setStepIndex(4)
  }, [maxAmountInput, onUserInput])

  async function onAttemptToApprove() {
    if (!stakingTokenContract || !library || !deadline) throw new Error(t('earn.missingDependencies'))
    const liquidityAmount = parsedAmount
    if (!liquidityAmount) throw new Error(t('earn.missingLiquidityAmount'))

    // try to gather a signature for permission
    const nonce = await stakingTokenContract.nonces(account)

    const EIP712Domain = [
      { name: 'name', type: 'string' },
      { name: 'chainId', type: 'uint256' },
      { name: 'verifyingContract', type: 'address' }
    ]
    const domain = {
      name: 'Pangolin',
      chainId: chainId,
      verifyingContract: stakingTokenContract.address
    }
    const Permit = [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ]
    const message = {
      owner: account,
      spender: stakingInfo.stakingRewardAddress,
      value: liquidityAmount.raw.toString(),
      nonce: nonce.toHexString(),
      deadline: deadline.toNumber()
    }
    const data = JSON.stringify({
      types: {
        EIP712Domain,
        Permit
      },
      domain,
      primaryType: 'Permit',
      message
    })

    library
      .send('eth_signTypedData_v4', [account, data])
      .then(splitSignature)
      .then(signature => {
        setSignatureData({
          v: signature.v,
          r: signature.r,
          s: signature.s,
          deadline: deadline.toNumber()
        })
      })
      .catch(error => {
        // for all errors other than 4001 (EIP-1193 user rejected request), fall back to manual approve
        if (error?.code !== 4001) {
          approveCallback()
        }
      })
  }

  console.log('isUnstakeDrawerVisible', isUnstakeDrawerVisible)

  const isDisabled = !userPngUnstaked?.greaterThan('0')
  return (
    <Root>
      {/* <StakedAmount>
        <span>{stakingInfo?.stakedAmount?.toSignificant(6, { groupSeparator: ',' })}</span>
        <TokenSymbol>{stakeToken}</TokenSymbol>
      </StakedAmount> */}

      {!attempting && !hash && (
        <>
          <Box mb="5px">
            <Text color="color4" fontSize={24} fontWeight={500} mb="5px">
              Stake
            </Text>

            {/* show already staked amount */}
            <Text color="color9" fontSize={14}>
              Stake your PNG token to share platform fees
            </Text>
          </Box>
          <TextInput
            value={parsedAmount?.toExact()}
            addonAfter={
              <Box display={'flex'} alignItems={'center'} height={'100%'} justifyContent={'center'}>
                <MaxButton onClick={() => handleMax()}>PNG</MaxButton>
              </Box>
            }
            onChange={(value: any) => {
              onUserInput(value as any)
            }}
            label={`Enter PNG`}
            fontSize={24}
            isNumeric={true}
            placeholder="0.00"
            addonLabel={
              account && (
                <Balance>
                  {!!userPngUnstaked ? t('currencyInputPanel.balance') + userPngUnstaked?.toSignificant(6) : ' -'}
                </Balance>
              )
            }
            disabled={isDisabled}
          />

          <Box>
            <Steps
              onChange={value => {
                onChangeDot && onChangeDot(value)
              }}
              current={stepIndex}
              progressDot={true}
            >
              <Step disabled={isDisabled} />
              <Step disabled={isDisabled} />
              <Step disabled={isDisabled} />
              <Step disabled={isDisabled} />
              <Step disabled={isDisabled} />
            </Steps>
          </Box>

          <StakeWrapper>
            <GridContainer>
              <Box>
                <Stat
                  title={`${t('migratePage.dollarWorth')}`}
                  stat={`${dollerWorth ? `$${dollerWorth?.toFixed(4)}` : '-'}`}
                  titlePosition="top"
                  titleFontSize={14}
                  statFontSize={18}
                  titleColor="text2"
                />
              </Box>

              <Box>
                <Stat
                  title={`${t('earn.weeklyRewards')}`}
                  stat={
                    hypotheticalRewardRate
                      ? `${hypotheticalRewardRate.multiply((60 * 60 * 24 * 7).toString()).toSignificant(4)}
                `
                      : '-'
                  }
                  titlePosition="top"
                  titleFontSize={14}
                  statFontSize={18}
                  titleColor="text2"
                  currency={stakingInfo?.rewardToken}
                />
              </Box>
            </GridContainer>
          </StakeWrapper>

          <Buttons isStaked={userPngUnstaked?.greaterThan('0')}>
            {/* show staked or get png button */}
            {userPngUnstaked?.greaterThan('0') ? (
              <>
                <Button
                  padding="15px 18px"
                  variant={approval === ApprovalState.APPROVED || signatureData !== null ? 'confirm' : 'primary'}
                  isDisabled={approval !== ApprovalState.NOT_APPROVED || signatureData !== null}
                  onClick={onAttemptToApprove}
                >
                  {t('earn.approve')}
                </Button>
                <Button
                  padding="15px 18px"
                  variant={'primary'}
                  isDisabled={!!error || (signatureData === null && approval !== ApprovalState.APPROVED)}
                  onClick={onStake}
                >
                  {error ?? t('earn.deposit')}
                </Button>
              </>
            ) : (
              <Button
                padding="15px 18px"
                variant="primary"
                as="a"
                href={`/#${BETA_MENU_LINK.swap}?inputCurrency=${ZERO_ADDRESS}&outputCurrency=${png.address}`}
              >
                {t('header.buy', { symbol: stakeToken })}
              </Button>
            )}

            {/* show unstak button */}
            {stakingInfo?.stakedAmount?.greaterThan('0') && (
              <UnstakeButton variant="outline" onClick={() => setShowUnstakeDrawer(true)}>
                {t('earnPage.unstake')}
              </UnstakeButton>
            )}
          </Buttons>
        </>
      )}
      {attempting && !hash && (
        <PendingWrapper>
          <Box mb={'15px'}>
            <Loader size={100} label="Staking" />
          </Box>
        </PendingWrapper>
      )}
      {hash && <TransactionCompleted onClose={wrappedOnDismiss} submitText="Staked" showCloseIcon={true} />}

      {/* Unstake Drawer */}
      {isUnstakeDrawerVisible && (
        <UnstakeDrawer
          isOpen={isUnstakeDrawerVisible}
          onClose={() => {
            setShowUnstakeDrawer(false)
          }}
          stakingInfo={stakingInfo}
        />
      )}
    </Root>
  )
}

export default StakeWidget

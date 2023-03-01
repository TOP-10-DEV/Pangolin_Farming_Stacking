import React from 'react'
import { MENU_LINK } from 'src/constants'
import { Root, Buttons, MaxButton, Balance, StakeWrapper, GridContainer } from './styled'
import {
  Box,
  Button,
  Text,
  TextInput,
  CurrencyLogo,
  NumberOptions,
  useTranslation,
  Stat,
  Loader,
  TransactionCompleted,
  ZERO_ADDRESS,
  TransactionApprovalState as ApprovalState
} from '@pangolindex/components'
import { SingleSideStakingInfo, useDerivedStakingProcess } from 'src/state/stake/hooks'

type Props = {
  stakingInfo: SingleSideStakingInfo
  onClose?: () => void
  isRewardStake?: boolean
}

const StakeWidget: React.FC<Props> = ({ stakingInfo, onClose, isRewardStake }) => {
  const { t } = useTranslation()

  const {
    stakeToken,
    attempting,
    parsedAmount,
    hash,
    userPngUnstaked,
    stepIndex,
    dollerWorth,
    hypotheticalRewardRatePerWeek,
    signatureData,
    error,
    approval,
    account,
    png,
    onUserInput,
    onAttemptToApprove,
    wrappedOnDismiss,
    handleMax,
    onStake,
    setStepIndex,
    onChangePercentage
  } = useDerivedStakingProcess(stakingInfo)

  const isDisabled = !userPngUnstaked?.greaterThan('0')

  const renderButtons = () => {
    if (!account) {
      return (
        <Button padding="15px 18px" variant="primary" isDisabled>
          {t('swapPage.connectWallet')}
        </Button>
      )
    }

    if (userPngUnstaked?.greaterThan('0')) {
      return (
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
      )
    }
    return (
      <Button
        padding="15px 18px"
        variant="primary"
        as="a"
        href={`/#${MENU_LINK.swap}?inputCurrency=${ZERO_ADDRESS}&outputCurrency=${png.address}`}
      >
        {t('header.buy', { symbol: stakeToken })}
      </Button>
    )
  }

  return (
    <Root>
      {!attempting && !hash && (
        <>
          {isRewardStake ? (
            <Box textAlign="center" mt={20} flex={1}>
              <Box display="flex" alignItems="center" justifyContent="center">
                <Text fontSize={['26px', '22px']} fontWeight={500} color="text1">
                  {parsedAmount?.toSignificant(6) || '0'}
                </Text>
                <Box ml={10} mt="8px">
                  <CurrencyLogo currency={png} size={24} imageSize={48} />
                </Box>
              </Box>

              <Text fontSize={['14px', '12px']} color="text2" textAlign="center" mt="15px" mb="15px">
                {t('stakePage.stakeYourReward')}
              </Text>
            </Box>
          ) : (
            <Box>
              <Box mb="5px">
                <Text color="color4" fontSize={[20, 16]} fontWeight={500} mb="5px">
                  {t('header.stake')}
                </Text>

                {/* show already staked amount */}
                <Text color="color9" fontSize={[14, 12]}>
                  {t('stakePage.stakePng')}
                </Text>
              </Box>
              <TextInput
                value={parsedAmount?.toExact() || '0'}
                addonAfter={
                  <Box display={'flex'} alignItems={'center'} height={'100%'} justifyContent={'center'}>
                    <MaxButton onClick={() => handleMax()}>PNG</MaxButton>
                  </Box>
                }
                onChange={(value: any) => {
                  onUserInput(value)
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
                <NumberOptions
                  onChange={value => {
                    setStepIndex(value)
                    onChangePercentage(value * 25)
                  }}
                  currentValue={stepIndex}
                  variant="step"
                  isDisabled={isDisabled}
                  isPercentage={true}
                />
              </Box>

              <StakeWrapper>
                <GridContainer>
                  <Box>
                    <Stat
                      title={`${t('migratePage.dollarWorth')}`}
                      stat={`${dollerWorth ? `$${dollerWorth?.toFixed(4)}` : '-'}`}
                      titlePosition="top"
                      titleFontSize={[14, 12]}
                      statFontSize={[18, 14]}
                      titleColor="text2"
                    />
                  </Box>

                  <Box>
                    <Stat
                      title={`${t('earn.weeklyRewards')}`}
                      stat={hypotheticalRewardRatePerWeek ? `${hypotheticalRewardRatePerWeek.toSignificant(4)}` : '-'}
                      titlePosition="top"
                      titleFontSize={[14, 12]}
                      statFontSize={[18, 14]}
                      titleColor="text2"
                      currency={stakingInfo?.rewardToken}
                    />
                  </Box>
                </GridContainer>
              </StakeWrapper>
            </Box>
          )}

          <Buttons isStaked={userPngUnstaked?.greaterThan('0') && !!account}>
            {/* show staked or get png button */}
            {renderButtons()}
          </Buttons>
        </>
      )}
      {attempting && !hash && (
        <Loader size={100} label={isRewardStake ? `${t('stakePage.rewardStaking')}` : `${t('sarStake.staking')}`} />
      )}
      {hash && (
        <TransactionCompleted
          onClose={() => {
            wrappedOnDismiss()
            onClose && onClose()
          }}
          submitText={isRewardStake ? `${t('stakePage.stakeSuccessMsg')}` : `${t('stakePage.staked')}`}
          showCloseIcon={isRewardStake ? false : true}
        />
      )}
    </Root>
  )
}

export default StakeWidget

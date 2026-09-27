import type { Ref } from 'react'
import { Box, Button, Text } from '@chakra-ui/react'
import { ChevronRight } from 'lucide-react'
import type { EventProjection, ViewId } from '../calendar'
import { eventTone, focusRing } from '../theme'

export function eventButton(
  projection: EventProjection,
  variant: ViewId,
  open: boolean,
  onClick?: () => void,
  buttonRef?: Ref<HTMLButtonElement>,
  buttonId?: string
) {
  const colors = eventTone[projection.tone]
  return (
    <Button
      id={buttonId}
      ref={buttonRef}
      variant="plain"
      w="100%"
      h="auto"
      minH={variant === 'list' ? '64px' : 'auto'}
      px={variant === 'list' ? '12px' : '7px'}
      py={variant === 'list' ? '9px' : '6px'}
      borderWidth="1px"
      borderColor={open ? 'calendar.focus' : colors.marker}
      borderLeftWidth={variant === 'list' ? '5px' : '3px'}
      borderRadius={variant === 'list' ? '11px' : '7px'}
      bg={colors.bg}
      color={colors.title}
      textAlign="left"
      justifyContent="space-between"
      whiteSpace="normal"
      onClick={onClick}
      _hover={{ filter: 'brightness(1.08)' }}
      _focusVisible={focusRing}
      aria-label={`${projection.event.title}, ${projection.timeLabel}${projection.event.location ? `, ${projection.event.location}` : ''}`}
    >
      <Box minW="0">
        {variant === 'grid' && (
          <Text color={colors.meta} fontSize="10px" fontWeight="500">
            {projection.timeLabel}
          </Text>
        )}
        <Text
          mt={variant === 'grid' ? '1px' : '0'}
          color={colors.title}
          fontSize={variant === 'grid' ? '11px' : '14px'}
          fontWeight="500"
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {projection.event.title}
        </Text>
        {variant === 'list' && (
          <Text mt="2px" color={colors.meta} fontSize="12px">
            {projection.timeLabel}
            {projection.event.location ? ` · ${projection.event.location}` : ''}
          </Text>
        )}
      </Box>
      {variant === 'list' && (
        <ChevronRight size={16} color="#AEBAC8" aria-hidden="true" />
      )}
    </Button>
  )
}

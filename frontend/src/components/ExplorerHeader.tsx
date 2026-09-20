import type { ReactNode } from 'react'
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Menu,
  Portal,
  Text,
  VisuallyHidden
} from '@chakra-ui/react'
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  PanelsTopLeft
} from 'lucide-react'
import type { FeedId } from '../calendar'
import { feedOrder, feeds } from '../content'
import { focusRing, menuContentProps, menuItemProps } from '../theme'

function CalendarMenu(props: {
  feed: FeedId
  onFeedChange: (feed: FeedId) => void
}) {
  return (
    <Menu.Root positioning={{ placement: 'bottom-start' }}>
      <Menu.Trigger asChild>
        <Button
          variant="plain"
          h="auto"
          minH="touchTarget"
          mx="-8px"
          px="8px"
          py="4px"
          borderRadius="9px"
          color="calendar.text"
          fontSize={{ base: '24px', md: '30px' }}
          fontWeight="500"
          letterSpacing="-.035em"
          lineHeight="1.08"
          justifyContent="flex-start"
          textAlign="left"
          whiteSpace="normal"
          _hover={{ color: 'calendar.link' }}
          _open={{ color: 'calendar.link' }}
          _focusVisible={focusRing}
        >
          <span>{feeds[props.feed].name}</span>
          <ChevronDown size={18} color="#91B8FF" aria-hidden="true" />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            {...menuContentProps}
            minW="0"
            w={{ base: 'min(430px, calc(100vw - 28px))', md: '390px' }}
          >
            <Menu.RadioItemGroup
              value={props.feed}
              onValueChange={({ value }) => props.onFeedChange(value as FeedId)}
            >
              {feedOrder.map(id => (
                <Menu.RadioItem
                  key={id}
                  value={id}
                  {...menuItemProps}
                  py="10px"
                  _checked={{ bg: 'action.subtle', color: '#E8F0FF' }}
                >
                  <Box flex="1" minW="0">
                    <Text fontWeight="500">{feeds[id].name}</Text>
                    <Text mt="2px" color="calendar.muted" fontSize="12px">
                      {feeds[id].helper}
                    </Text>
                  </Box>
                  <Menu.ItemIndicator color="calendar.focus">
                    <Check size={16} aria-hidden="true" />
                  </Menu.ItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioItemGroup>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

function SubscriptionMenu(props: {
  url: string | null
  disabled: boolean
  onStatus: (status: string) => void
}) {
  if (!props.url)
    return (
      <Button
        disabled
        aria-describedby="subscription-status"
        h="touchTarget"
        px="14px"
        borderRadius="10px"
        bg="action.solid"
        color="action.contrast"
        fontSize="13px"
        fontWeight="500"
        _disabled={{ opacity: 0.55, cursor: 'not-allowed' }}
      >
        <CalendarPlus size={16} aria-hidden="true" /> Add to calendar
        <ChevronDown size={14} aria-hidden="true" />
      </Button>
    )

  const url = props.url
  const copy = async (kind: string) => {
    try {
      await navigator.clipboard.writeText(url)
      props.onStatus(
        kind === 'google'
          ? 'Link copied. Add it under Other calendars › From URL.'
          : kind === 'outlook'
            ? 'Link copied. Choose Add calendar › Subscribe from web.'
            : 'Subscription link copied.'
      )
    } catch {
      props.onStatus('Couldn’t copy the link. Try again.')
    }
  }
  const webcal = url.replace(/^https?:/, 'webcal:')
  const item = (
    value: string,
    icon: ReactNode,
    title: string,
    helper: string
  ) => (
    <Menu.Item
      value={value}
      {...menuItemProps}
      onClick={() => void copy(value)}
    >
      {icon}
      <Box>
        <Text fontWeight="500">{title}</Text>
        <Text color="calendar.muted" fontSize="12px">
          {helper}
        </Text>
      </Box>
    </Menu.Item>
  )

  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        <Button
          disabled={props.disabled}
          aria-describedby={props.disabled ? 'subscription-status' : undefined}
          h="touchTarget"
          px="14px"
          borderRadius="10px"
          bg="action.solid"
          color="action.contrast"
          fontSize="13px"
          fontWeight="500"
          _hover={{ bg: 'action.500' }}
          _active={{ bg: 'action.700' }}
          _disabled={{ opacity: 0.55, cursor: 'not-allowed' }}
          _focusVisible={focusRing}
        >
          <CalendarPlus size={16} aria-hidden="true" /> Add to calendar
          <ChevronDown size={14} aria-hidden="true" />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            {...menuContentProps}
            minW="0"
            w="min(330px, calc(100vw - 28px))"
          >
            <Menu.Item value="apple" asChild {...menuItemProps}>
              <a href={webcal}>
                <CalendarPlus size={17} color="#91B8FF" aria-hidden="true" />
                <Box>
                  <Text fontWeight="500">Apple Calendar</Text>
                  <Text color="calendar.muted" fontSize="12px">
                    Open Calendar and subscribe
                  </Text>
                </Box>
              </a>
            </Menu.Item>
            {item(
              'google',
              <CalendarDays size={17} color="#91B8FF" aria-hidden="true" />,
              'Google Calendar',
              'Copy link, then open “From URL”'
            )}
            {item(
              'outlook',
              <PanelsTopLeft size={17} color="#91B8FF" aria-hidden="true" />,
              'Outlook',
              'Copy link, then “Subscribe from web”'
            )}
            <Menu.Item value="other" asChild {...menuItemProps}>
              <a href={webcal}>
                <ExternalLink size={17} color="#91B8FF" aria-hidden="true" />
                <Box>
                  <Text fontWeight="500">Another calendar app</Text>
                  <Text color="calendar.muted" fontSize="12px">
                    Try your default calendar app
                  </Text>
                </Box>
              </a>
            </Menu.Item>
            {item(
              'copy',
              <Copy size={17} color="#91B8FF" aria-hidden="true" />,
              'Copy subscription link',
              'For Fastmail, Thunderbird, and others'
            )}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

export function ExplorerHeader(props: {
  feed: FeedId
  feedUrl: string | null
  subscriptionDisabled: boolean
  subscriptionMessage: string
  status: string
  onFeedChange: (feed: FeedId) => void
  onStatus: (status: string) => void
}) {
  return (
    <Box as="header" borderBottomWidth="1px" borderColor="calendar.border">
      <Container
        maxW="1440px"
        px={{ base: '14px', md: '24px' }}
        py={{ base: '18px', md: '26px' }}
      >
        <Flex
          align={{ base: 'stretch', md: 'center' }}
          justify="space-between"
          direction={{ base: 'column', md: 'row' }}
          gap={{ base: '15px', md: '24px' }}
        >
          <Box minW="0">
            <VisuallyHidden>
              <Heading as="h1">{feeds[props.feed].name}</Heading>
            </VisuallyHidden>
            <CalendarMenu feed={props.feed} onFeedChange={props.onFeedChange} />
            <Text mt="5px" color="calendar.muted" fontSize="14px">
              {feeds[props.feed].subtitle}
            </Text>
          </Box>
          <Flex
            align={{ base: 'flex-start', md: 'flex-end' }}
            direction="column"
            gap="7px"
          >
            <SubscriptionMenu
              url={props.feedUrl}
              disabled={props.subscriptionDisabled}
              onStatus={props.onStatus}
            />
            <Box maxW="350px" textAlign={{ base: 'left', md: 'right' }}>
              <Text
                id="subscription-status"
                color="calendar.muted"
                fontSize="12px"
              >
                {props.subscriptionMessage}
              </Text>
              <Text
                minH="17px"
                mt="2px"
                color="calendar.link"
                fontSize="11px"
                aria-live="polite"
              >
                {props.status}
              </Text>
            </Box>
          </Flex>
        </Flex>
      </Container>
    </Box>
  )
}

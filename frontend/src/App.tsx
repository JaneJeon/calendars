import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
  type ReactNode
} from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Box,
  Button,
  Checkbox,
  CloseButton,
  Collapsible,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  IconButton,
  Menu,
  Popover,
  Portal,
  Spinner,
  Stack,
  Tabs,
  Text,
  VisuallyHidden
} from '@chakra-ui/react'
import {
  ArrowUpRight,
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Filter,
  Layers2,
  List,
  MapPin,
  PanelsTopLeft,
  RefreshCw
} from 'lucide-react'
import {
  codexResetTypes,
  dtsmDefaultVenueIds,
  type CodexResetType,
  type DtsmFilterOption
} from '@janejeon/calendars-shared'
import {
  CALENDAR_API_ORIGIN,
  feedStaleTime,
  fetchCalendar,
  fetchDtsmOptions
} from './api'
import {
  currentMonth,
  dateKey,
  eventDetailTime,
  fullDate,
  monthGrid,
  monthLabel,
  projectionsForMonth,
  shiftMonth,
  shortWeekday,
  type CalendarEvent,
  type EventProjection,
  type FeedId,
  type ViewId
} from './calendar'
import {
  buildFeedUrl,
  defaultExplorerState,
  readExplorerState,
  reconcileDtsmFilters,
  selectionSummary,
  sortFilterOptions,
  toggleId,
  writeExplorerState,
  type ExplorerState,
  type IdSelection
} from './filters'
import {
  controlProps,
  eventTone,
  focusRing,
  menuContentProps,
  menuItemProps
} from './theme'

const feeds = {
  dtsm: {
    name: 'Downtown San Mateo events',
    subtitle: 'What’s happening around B Street, Central Park, and downtown.',
    helper: 'Markets, festivals, and neighborhood events'
  },
  codex: {
    name: 'Codex reset watch',
    subtitle:
      'Reset history, scheduled windows, and forecasts in one calm view.',
    helper: 'Reset history and scheduled windows'
  }
} as const
const feedOrder: FeedId[] = ['codex', 'dtsm']
const resetLabels: Record<CodexResetType, string> = {
  regular: 'Regular resets',
  banked: 'Banked resets',
  scheduled: 'Scheduled windows',
  forecast: 'Forecasts'
}

function mediaMatches(query: string): boolean {
  return typeof matchMedia === 'function' && matchMedia(query).matches
}

function useMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => mediaMatches(query))
  useEffect(() => {
    /* istanbul ignore next -- Vite only mounts this browser application in a DOM. */
    if (typeof matchMedia !== 'function') return
    const media = matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

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
          minH="44px"
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
        h="44px"
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
          h="44px"
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

function EntityFilterMenu(props: {
  label: string
  noun: string
  selection: IdSelection
  options: DtsmFilterOption[]
  isDefaultPlaces?: boolean
  onChange: (selection: IdSelection) => void
}) {
  const orderedOptions = sortFilterOptions(props.options)
  const allIds = orderedOptions.map(option => option.id)
  const summary = selectionSummary(
    props.selection,
    props.options,
    props.noun,
    props.isDefaultPlaces
  )
  return (
    <Menu.Root
      closeOnSelect={false}
      positioning={{ placement: 'bottom-start' }}
    >
      <Menu.Trigger asChild>
        <Button
          {...controlProps}
          minW={{ base: '0', md: '190px' }}
          w={{ base: '100%', md: 'auto' }}
          justifyContent="space-between"
          aria-label={`${props.label}: ${summary}`}
        >
          <Text truncate>{summary}</Text>
          <ChevronDown size={15} color="#AEBAC8" aria-hidden="true" />
        </Button>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content
            {...menuContentProps}
            minW="260px"
            maxW="min(390px, calc(100vw - 28px))"
            maxH="min(430px, var(--available-height))"
            overflowY="auto"
          >
            <Menu.CheckboxItem
              value="all"
              checked={props.selection === null}
              onCheckedChange={checked => props.onChange(checked ? null : [])}
              {...menuItemProps}
            >
              <Text flex="1">All {props.noun}</Text>
              <Menu.ItemIndicator color="calendar.focus">
                <Check size={15} />
              </Menu.ItemIndicator>
            </Menu.CheckboxItem>
            <Menu.Separator borderColor="calendar.border" />
            {orderedOptions.map(option => (
              <Menu.CheckboxItem
                key={option.id}
                value={String(option.id)}
                valueText={option.name}
                checked={
                  props.selection === null ||
                  props.selection.includes(option.id)
                }
                onCheckedChange={checked =>
                  props.onChange(
                    toggleId(props.selection, option.id, checked, allIds)
                  )
                }
                {...menuItemProps}
              >
                <Text flex="1">{option.name}</Text>
                <Menu.ItemIndicator color="calendar.focus">
                  <Check size={15} />
                </Menu.ItemIndicator>
              </Menu.CheckboxItem>
            ))}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}

function FilterCheckbox(props: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <Checkbox.Root
      checked={props.checked}
      onCheckedChange={({ checked }) => props.onChange(Boolean(checked))}
      minH="44px"
      px="10px"
      borderWidth="1px"
      borderColor={props.checked ? 'calendar.focus' : 'calendar.controlBorder'}
      borderRadius="10px"
      bg={props.checked ? 'action.subtle' : 'calendar.inset'}
      color={props.checked ? '#E8F0FF' : 'calendar.text'}
      fontSize="13px"
      fontWeight="500"
      _focusVisible={focusRing}
    >
      <Checkbox.HiddenInput />
      <Checkbox.Control colorPalette="action">
        <Checkbox.Indicator />
      </Checkbox.Control>
      <Checkbox.Label>{props.label}</Checkbox.Label>
    </Checkbox.Root>
  )
}

function EventDetails(props: {
  event: CalendarEvent
  closeControl?: ReactNode
}) {
  const category =
    props.event.categories.join(', ') || feeds[props.event.calendar].name
  return (
    <Box>
      <Flex align="start" justify="space-between" gap="16px">
        <Box>
          <Text
            color="calendar.link"
            fontSize="11px"
            fontWeight="500"
            letterSpacing=".06em"
            textTransform="uppercase"
          >
            {category}
          </Text>
          <Heading
            as="h3"
            mt="5px"
            color="calendar.text"
            fontSize="20px"
            fontWeight="500"
            lineHeight="1.15"
          >
            {props.event.title}
          </Heading>
        </Box>
        {props.closeControl}
      </Flex>
      <Stack
        mt="17px"
        gap="11px"
        pt="15px"
        borderTopWidth="1px"
        borderColor="calendar.border"
      >
        <HStack align="start" gap="9px">
          <CalendarDays size={16} color="#91B8FF" aria-hidden="true" />
          <Text color="calendar.text" fontSize="13px">
            {eventDetailTime(props.event)}
          </Text>
        </HStack>
        {props.event.location && (
          <HStack align="start" gap="9px">
            <MapPin size={16} color="#91B8FF" aria-hidden="true" />
            <Text color="calendar.text" fontSize="13px">
              {props.event.location}
            </Text>
          </HStack>
        )}
        <HStack align="start" gap="9px">
          <Layers2 size={16} color="#91B8FF" aria-hidden="true" />
          <Text color="calendar.text" fontSize="13px">
            {feeds[props.event.calendar].name}
          </Text>
        </HStack>
      </Stack>
      {props.event.description && (
        <Text
          mt="15px"
          color="calendar.muted"
          fontSize="13px"
          lineHeight="1.55"
        >
          {props.event.description}
        </Text>
      )}
      {props.event.url && (
        <Button
          asChild
          variant="plain"
          mt="15px"
          minH={{ base: '44px', md: 'auto' }}
          p={{ base: '8px 0', md: '0' }}
          color="calendar.link"
          fontSize="13px"
          fontWeight="500"
          _focusVisible={focusRing}
        >
          <a href={props.event.url} target="_blank" rel="noopener noreferrer">
            View event source <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </Button>
      )}
    </Box>
  )
}

function eventButton(
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

function EventTrigger(props: {
  projection: EventProjection
  variant: ViewId
  isNarrow: boolean
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
}) {
  const open = props.selectedKey === props.projection.key
  const triggerRef = useRef<HTMLButtonElement>(null)
  if (props.isNarrow && props.variant === 'list')
    return (
      <Collapsible.Root
        open={open}
        onOpenChange={({ open }) =>
          props.setSelectedKey(open ? props.projection.key : null)
        }
      >
        <Collapsible.Trigger asChild>
          {eventButton(
            props.projection,
            props.variant,
            open,
            undefined,
            triggerRef
          )}
        </Collapsible.Trigger>
        <Collapsible.Content>
          <Box
            mt="6px"
            p="16px"
            borderWidth="1px"
            borderColor="calendar.controlBorder"
            borderRadius="11px"
            bg="calendar.raised"
          >
            <EventDetails
              event={props.projection.event}
              closeControl={
                <CloseButton
                  aria-label="Close event details"
                  size="sm"
                  minW={{ base: '44px', md: '32px' }}
                  minH={{ base: '44px', md: '32px' }}
                  color="calendar.muted"
                  _hover={{ bg: 'action.subtle', color: 'calendar.text' }}
                  _focusVisible={focusRing}
                  onClick={() => {
                    props.setSelectedKey(null)
                    requestAnimationFrame(() => triggerRef.current?.focus())
                  }}
                />
              }
            />
          </Box>
        </Collapsible.Content>
      </Collapsible.Root>
    )
  return (
    <Popover.Root
      open={open}
      onOpenChange={({ open }) =>
        props.setSelectedKey(open ? props.projection.key : null)
      }
      positioning={{
        placement: 'bottom-start',
        strategy: 'fixed',
        hideWhenDetached: true,
        gutter: 8
      }}
      autoFocus={false}
      modal={false}
      lazyMount
      unmountOnExit
    >
      <Popover.Trigger asChild>
        {eventButton(props.projection, props.variant, open)}
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            aria-label={`${props.projection.event.title} details`}
            w="min(350px, calc(100vw - 28px))"
            p="17px"
            borderWidth="1px"
            borderColor="calendar.controlBorder"
            borderRadius="13px"
            bg="calendar.raised"
            color="calendar.text"
            boxShadow="0 18px 54px rgba(0,0,0,.42)"
            zIndex="90"
            style={
              {
                '--popover-bg': 'var(--chakra-colors-calendar-raised)'
              } as CSSProperties
            }
          >
            <Popover.Arrow>
              <Popover.ArrowTip
                bg="calendar.raised"
                borderColor="calendar.controlBorder"
              />
            </Popover.Arrow>
            <EventDetails
              event={props.projection.event}
              closeControl={
                <Popover.CloseTrigger asChild>
                  <CloseButton
                    aria-label="Close event details"
                    size="sm"
                    color="calendar.muted"
                    _hover={{ bg: 'action.subtle', color: 'calendar.text' }}
                    _focusVisible={focusRing}
                  />
                </Popover.CloseTrigger>
              }
            />
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

function overflowEventButtonId(key: string): string {
  return `calendar-overflow-event-${encodeURIComponent(key)}`
}

function OverflowPopover(props: {
  projections: EventProjection[]
  day: string
}) {
  const [selected, setSelected] = useState<EventProjection | null>(null)
  const [focusTarget, setFocusTarget] = useState<string | null>(null)
  const backButtonId = `calendar-overflow-back-${props.day}`
  const selectEvent = (projection: EventProjection) => {
    setSelected(projection)
    setFocusTarget('back')
  }
  const showEventList = (selectedKey: string) => {
    setSelected(null)
    setFocusTarget(selectedKey)
  }
  return (
    <Popover.Root
      positioning={{
        placement: 'bottom-start',
        strategy: 'fixed',
        hideWhenDetached: true,
        gutter: 7
      }}
      autoFocus={false}
      onOpenChange={({ open }) => !open && setSelected(null)}
    >
      <Popover.Trigger asChild>
        <Button
          variant="plain"
          h="auto"
          minH="24px"
          px="6px"
          py="2px"
          color="calendar.muted"
          fontSize="11px"
          fontWeight="500"
          _hover={{ color: 'calendar.link' }}
          _focusVisible={focusRing}
        >
          +{props.projections.length} more
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            w="min(350px, calc(100vw - 28px))"
            p="7px"
            borderWidth="1px"
            borderColor="calendar.controlBorder"
            borderRadius="12px"
            bg="calendar.raised"
            color="calendar.text"
            boxShadow="0 18px 54px rgba(0,0,0,.42)"
            zIndex="90"
            style={
              {
                '--popover-bg': 'var(--chakra-colors-calendar-raised)'
              } as CSSProperties
            }
          >
            <Flex px="8px" py="7px" align="center" justify="space-between">
              <Popover.Title fontSize="13px" fontWeight="500">
                {selected ? 'Event details' : fullDate(props.day)}
              </Popover.Title>
              <Popover.CloseTrigger asChild>
                <CloseButton
                  aria-label="Close day events"
                  size="sm"
                  color="calendar.muted"
                  _focusVisible={focusRing}
                />
              </Popover.CloseTrigger>
            </Flex>
            {selected ? (
              <Box px="8px" pb="8px">
                <Button
                  id={backButtonId}
                  ref={element => {
                    if (element && focusTarget === 'back')
                      requestAnimationFrame(() => element.focus())
                  }}
                  variant="plain"
                  h="auto"
                  mb="12px"
                  p="4px 6px"
                  color="calendar.link"
                  onClick={() => showEventList(selected.key)}
                  _focusVisible={focusRing}
                >
                  <ChevronLeft size={14} /> Back to {fullDate(props.day)}
                </Button>
                <EventDetails event={selected.event} />
              </Box>
            ) : (
              <Stack gap="3px">
                {props.projections.map(projection => (
                  <Box key={projection.key}>
                    {eventButton(
                      projection,
                      'list',
                      false,
                      () => selectEvent(projection),
                      element => {
                        if (element && focusTarget === projection.key)
                          requestAnimationFrame(() => element.focus())
                      },
                      overflowEventButtonId(projection.key)
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

function dateKeyFromToday(): string {
  const [year, month] = currentMonth().split('-')
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    day: '2-digit'
  }).format(new Date())
  return `${year}-${month}-${day}`
}

function CalendarGrid(props: {
  month: string
  projections: EventProjection[]
  isNarrow: boolean
  compact: boolean
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
  showDayInList: (day: string) => void
}) {
  const today = currentMonth() === props.month ? dateKeyFromToday() : ''
  const limit = props.compact ? 2 : 3
  const dates = monthGrid(props.month)
  const weeks = Array.from({ length: 6 }, (_, index) =>
    dates.slice(index * 7, index * 7 + 7)
  )
  return (
    <Box role="table" aria-label={monthLabel(props.month)}>
      <Grid
        role="row"
        gridTemplateColumns="repeat(7, minmax(0, 1fr))"
        borderBottomWidth="1px"
        borderColor="calendar.border"
        bg="calendar.inset"
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <Text
            key={day}
            role="columnheader"
            px={{ base: '2px', md: '10px' }}
            py="8px"
            color="calendar.subtle"
            fontSize="11px"
            fontWeight="500"
            textAlign={{ base: 'center', md: 'right' }}
            textTransform="uppercase"
          >
            {day}
          </Text>
        ))}
      </Grid>
      {weeks.map((week, weekIndex) => (
        <Grid
          key={dateKey(week[0]!)}
          role="row"
          gridTemplateColumns="repeat(7, minmax(0, 1fr))"
        >
          {week.map((date, dayIndex) => {
            const index = weekIndex * 7 + dayIndex
            const key = dateKey(date)
            const outside = !key.startsWith(`${props.month}-`)
            const matches = outside
              ? []
              : props.projections.filter(item => item.dateKey === key)
            return (
              <Box
                key={key}
                role="cell"
                position="relative"
                minH={{ base: '66px', md: '132px' }}
                p={{ base: '5px 3px', md: '9px' }}
                _after={{
                  content: '""',
                  position: 'absolute',
                  inset: '0',
                  borderRightWidth: index % 7 === 6 ? '0' : '1px',
                  borderBottomWidth: index >= 35 ? '0' : '1px',
                  borderColor: 'calendar.border',
                  pointerEvents: 'none'
                }}
                bg={
                  key === today
                    ? 'action.950'
                    : outside
                      ? 'calendar.inset'
                      : 'calendar.surface'
                }
                overflow="hidden"
              >
                <Flex justify="flex-end">
                  <Flex
                    align="center"
                    justify="center"
                    w="25px"
                    h="25px"
                    borderRadius="full"
                    bg={key === today ? 'action.solid' : 'transparent'}
                    color={key === today ? 'white' : 'calendar.muted'}
                    fontSize="11px"
                    fontWeight="500"
                  >
                    {date.day}
                  </Flex>
                </Flex>
                {!outside && props.isNarrow && matches.length > 0 && (
                  <>
                    <HStack
                      justify="center"
                      gap="3px"
                      mt="4px"
                      aria-hidden="true"
                    >
                      {matches.slice(0, 3).map(item => (
                        <Box
                          key={item.key}
                          w="6px"
                          h="6px"
                          borderRadius="full"
                          bg={eventTone[item.tone].marker}
                        />
                      ))}
                    </HStack>
                    <Button
                      position="absolute"
                      inset="0"
                      w="100%"
                      h="100%"
                      p="0"
                      border="0"
                      bg="transparent"
                      aria-label={`${fullDate(key)}, ${matches.length} event${matches.length === 1 ? '' : 's'}. Show in List.`}
                      onClick={() => props.showDayInList(key)}
                      _focusVisible={{
                        outline: '2px solid',
                        outlineColor: 'calendar.focus',
                        outlineOffset: '-3px'
                      }}
                    />
                  </>
                )}
                {!outside && !props.isNarrow && (
                  <Stack gap="4px" mt="4px">
                    {matches.slice(0, limit).map(item => (
                      <EventTrigger
                        key={item.key}
                        projection={item}
                        variant="grid"
                        isNarrow={false}
                        selectedKey={props.selectedKey}
                        setSelectedKey={props.setSelectedKey}
                      />
                    ))}
                    {matches.length > limit && (
                      <OverflowPopover
                        projections={matches.slice(limit)}
                        day={key}
                      />
                    )}
                  </Stack>
                )}
              </Box>
            )
          })}
        </Grid>
      ))}
    </Box>
  )
}

function CalendarList(props: {
  projections: EventProjection[]
  isNarrow: boolean
  selectedKey: string | null
  setSelectedKey: (key: string | null) => void
}) {
  const groups = useMemo(() => {
    const result = new Map<string, EventProjection[]>()
    for (const item of props.projections)
      result.set(item.dateKey, [...(result.get(item.dateKey) ?? []), item])
    return result
  }, [props.projections])
  return (
    <Stack w="min(900px, calc(100% - 28px))" mx="auto" py="12px" gap="0">
      {[...groups].map(([day, events]) => (
        <Grid
          key={day}
          id={`calendar-list-day-${day}`}
          gridTemplateColumns={{
            base: '48px minmax(0,1fr)',
            md: '72px minmax(0,1fr)'
          }}
          gap={{ base: '10px', md: '18px' }}
          py="16px"
          borderBottomWidth="1px"
          borderColor="calendar.border"
        >
          <Box pt="3px">
            <Text
              color="calendar.subtle"
              fontSize="11px"
              fontWeight="500"
              textTransform="uppercase"
            >
              {shortWeekday(day)}
            </Text>
            <Text
              mt="1px"
              color="calendar.text"
              fontSize="24px"
              fontWeight="500"
              lineHeight="1"
            >
              {Number(day.slice(-2))}
            </Text>
          </Box>
          <Stack gap="7px">
            {events.map(item => (
              <EventTrigger
                key={item.key}
                projection={item}
                variant="list"
                isNarrow={props.isNarrow}
                selectedKey={props.selectedKey}
                setSelectedKey={props.setSelectedKey}
              />
            ))}
          </Stack>
        </Grid>
      ))}
    </Stack>
  )
}

function LoadState(props: {
  pending: boolean
  error: Error | null
  emptyMessage?: string
  retry: () => void
  children: ReactNode
}) {
  if (props.emptyMessage)
    return (
      <Text py="64px" px="18px" color="calendar.muted" textAlign="center">
        {props.emptyMessage}
      </Text>
    )
  if (props.pending)
    return (
      <Flex minH="360px" align="center" justify="center" gap="10px">
        <Spinner size="sm" color="calendar.focus" />
        <Text color="calendar.muted">Loading calendar…</Text>
      </Flex>
    )
  if (props.error)
    return (
      <Stack minH="360px" align="center" justify="center" gap="12px" px="18px">
        <Text color="calendar.danger" textAlign="center">
          Couldn’t load this calendar. {props.error.message}
        </Text>
        <Button {...controlProps} onClick={props.retry}>
          <RefreshCw size={15} /> Retry
        </Button>
      </Stack>
    )
  return props.children
}

export default function App() {
  const isNarrow = useMedia('(max-width: 700px)')
  const compactGrid = useMedia('(max-width: 1150px)')
  const [state, setState] = useState<ExplorerState>(() => {
    /* istanbul ignore if -- localStorage is present in every supported browser. */
    if (typeof localStorage === 'undefined') return defaultExplorerState(false)
    return readExplorerState(localStorage, mediaMatches('(max-width: 700px)'))
  })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [focusDay, setFocusDay] = useState<string | null>(null)
  const reconciled = useRef(false)

  useEffect(() => {
    /* istanbul ignore else -- localStorage is present in every supported browser. */
    if (typeof localStorage !== 'undefined')
      writeExplorerState(localStorage, state)
  }, [state])
  useEffect(() => {
    if (!status) return
    const timeout = window.setTimeout(() => setStatus(''), 4200)
    return () => window.clearTimeout(timeout)
  }, [status])

  const optionsQuery = useQuery({
    queryKey: ['dtsm-options', CALENDAR_API_ORIGIN],
    queryFn: ({ signal }) => fetchDtsmOptions(signal),
    staleTime: 60 * 60 * 1000,
    retry: 1
  })
  useEffect(() => {
    if (!optionsQuery.data || reconciled.current) return
    reconciled.current = true
    setState(current => ({
      ...current,
      filters: {
        ...current.filters,
        dtsm: reconcileDtsmFilters(current.filters.dtsm, optionsQuery.data)
      }
    }))
  }, [optionsQuery.data])

  const feedUrl = useMemo(
    () => buildFeedUrl(CALENDAR_API_ORIGIN, state.feed, state.filters),
    [state.feed, state.filters]
  )
  const feedQuery = useQuery({
    queryKey: ['calendar-feed', state.feed, feedUrl],
    queryFn: ({ signal }) => fetchCalendar(feedUrl!, state.feed, signal),
    enabled: feedUrl !== null,
    staleTime: feedStaleTime(state.feed),
    retry: 1
  })
  const projections = useMemo(
    () => projectionsForMonth(feedQuery.data ?? [], state.month),
    [feedQuery.data, state.month]
  )
  const change = (fn: (current: ExplorerState) => ExplorerState) => {
    setSelectedKey(null)
    setState(fn)
  }
  const setView = (view: ViewId) => change(current => ({ ...current, view }))
  const setDtsmFilter = (
    key: 'venueIds' | 'organizerIds' | 'categoryIds',
    value: IdSelection
  ) =>
    change(current => ({
      ...current,
      filters: {
        ...current.filters,
        dtsm: { ...current.filters.dtsm, [key]: value }
      }
    }))
  const toggleReset = (type: CodexResetType, checked: boolean) =>
    change(current => {
      const next = new Set(current.filters.codex.types)
      if (checked) next.add(type)
      else next.delete(type)
      return {
        ...current,
        filters: {
          ...current.filters,
          codex: { types: codexResetTypes.filter(value => next.has(value)) }
        }
      }
    })

  useEffect(() => {
    if (!focusDay || state.view !== 'list') return
    requestAnimationFrame(() => {
      document
        .getElementById(`calendar-list-day-${focusDay}`)
        ?.querySelector<HTMLElement>('button')
        ?.focus()
      setFocusDay(null)
    })
  }, [focusDay, state.view, projections])

  const venueIsDefault =
    state.filters.dtsm.venueIds !== null &&
    state.filters.dtsm.venueIds.length === dtsmDefaultVenueIds.length &&
    dtsmDefaultVenueIds.every(id => state.filters.dtsm.venueIds?.includes(id))
  const activeFilters =
    state.feed === 'dtsm'
      ? Number(!venueIsDefault) +
        Number(state.filters.dtsm.organizerIds !== null) +
        Number(state.filters.dtsm.categoryIds !== null)
      : Number(state.filters.codex.types.length !== codexResetTypes.length)
  const emptyMessage =
    feedUrl === null
      ? 'No events match an empty filter selection. Choose at least one option to subscribe.'
      : feedQuery.isSuccess && projections.length === 0
        ? `No events in ${monthLabel(state.month)} for these filters.`
        : undefined
  const subscriptionDisabled = feedUrl === null || !feedQuery.isSuccess
  const subscriptionMessage =
    feedUrl === null
      ? 'Choose at least one filter option before subscribing.'
      : feedQuery.isPending
        ? 'Loading this exact subscription before it can be added.'
        : feedQuery.isError
          ? 'Retry this calendar before subscribing.'
          : 'Subscription matches these filters and includes every date.'

  const options = optionsQuery.data
  const filterControls =
    state.feed === 'dtsm' ? (
      <Flex
        align={{ base: 'stretch', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap="12px"
        w="100%"
      >
        {options ? (
          <>
            {(
              [
                [
                  'Places',
                  'places',
                  'venueIds',
                  state.filters.dtsm.venueIds,
                  options.venues,
                  true
                ],
                [
                  'Type',
                  'types',
                  'categoryIds',
                  state.filters.dtsm.categoryIds,
                  options.categories,
                  false
                ],
                [
                  'Host',
                  'hosts',
                  'organizerIds',
                  state.filters.dtsm.organizerIds,
                  options.organizers,
                  false
                ]
              ] as const
            ).map(([label, noun, key, selection, values, isDefaultPlaces]) => (
              <Flex
                key={key}
                align={{ base: 'stretch', md: 'center' }}
                direction={{ base: 'column', md: 'row' }}
                gap="8px"
              >
                <Text color="calendar.subtle" fontSize="12px" fontWeight="500">
                  {label}
                </Text>
                <EntityFilterMenu
                  label={label}
                  noun={noun}
                  selection={selection}
                  options={values}
                  isDefaultPlaces={isDefaultPlaces}
                  onChange={value => setDtsmFilter(key, value)}
                />
              </Flex>
            ))}
          </>
        ) : optionsQuery.isPending ? (
          <HStack color="calendar.muted">
            <Spinner size="xs" /> <Text fontSize="13px">Loading filters…</Text>
          </HStack>
        ) : (
          <HStack justify="space-between" w="100%" gap="12px">
            <Text color="calendar.danger" fontSize="13px">
              Filters are unavailable. The saved calendar can still load.
            </Text>
            <Button
              {...controlProps}
              onClick={() => void optionsQuery.refetch()}
            >
              Retry
            </Button>
          </HStack>
        )}
      </Flex>
    ) : (
      <Flex
        align={{ base: 'stretch', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap="8px"
      >
        <Text color="calendar.subtle" fontSize="12px" fontWeight="500">
          Reset type
        </Text>
        <Flex wrap="wrap" gap="8px">
          {codexResetTypes.map(type => (
            <FilterCheckbox
              key={type}
              checked={state.filters.codex.types.includes(type)}
              label={resetLabels[type]}
              onChange={checked => toggleReset(type, checked)}
            />
          ))}
        </Flex>
      </Flex>
    )

  return (
    <Box
      id="calendar-explorer"
      minH="100vh"
      w="100%"
      pb="52px"
      bg="calendar.canvas"
      color="calendar.text"
      fontFamily="body"
      lineHeight="1.45"
    >
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
                <Heading as="h1">{feeds[state.feed].name}</Heading>
              </VisuallyHidden>
              <CalendarMenu
                feed={state.feed}
                onFeedChange={feed => change(current => ({ ...current, feed }))}
              />
              <Text mt="5px" color="calendar.muted" fontSize="14px">
                {feeds[state.feed].subtitle}
              </Text>
            </Box>
            <Flex
              align={{ base: 'flex-start', md: 'flex-end' }}
              direction="column"
              gap="7px"
            >
              <SubscriptionMenu
                url={feedUrl}
                disabled={subscriptionDisabled}
                onStatus={setStatus}
              />
              <Box maxW="350px" textAlign={{ base: 'left', md: 'right' }}>
                <Text
                  id="subscription-status"
                  color="calendar.muted"
                  fontSize="12px"
                >
                  {subscriptionMessage}
                </Text>
                <Text
                  minH="17px"
                  mt="2px"
                  color="calendar.link"
                  fontSize="11px"
                  aria-live="polite"
                >
                  {status}
                </Text>
              </Box>
            </Flex>
          </Flex>
        </Container>
      </Box>

      <Container
        as="main"
        maxW="1440px"
        px={{ base: '14px', md: '24px' }}
        pt={{ base: '14px', md: '20px' }}
      >
        {isNarrow ? (
          <Collapsible.Root
            open={filtersOpen}
            onOpenChange={({ open }) => setFiltersOpen(open)}
          >
            <Collapsible.Trigger asChild>
              <Button
                {...controlProps}
                w="100%"
                h="48px"
                px="13px"
                justifyContent="space-between"
              >
                <HStack gap="8px">
                  <Filter size={16} color="#91B8FF" />
                  <span>
                    {state.feed === 'dtsm' ? 'Filter events' : 'Filter resets'}
                  </span>
                </HStack>
                <Text color="calendar.muted" fontSize="11px">
                  {activeFilters
                    ? `${activeFilters} active`
                    : state.feed === 'dtsm'
                      ? 'Default events'
                      : 'All resets'}
                </Text>
              </Button>
            </Collapsible.Trigger>
            <Collapsible.Content>
              <Box
                mt="9px"
                p="13px"
                borderWidth="1px"
                borderColor="calendar.controlBorder"
                borderRadius="12px"
                bg="calendar.surface"
              >
                {filterControls}
              </Box>
            </Collapsible.Content>
          </Collapsible.Root>
        ) : (
          <Box
            as="section"
            aria-label={
              state.feed === 'dtsm' ? 'Event filters' : 'Reset filters'
            }
            minH="64px"
            p="11px 14px"
            borderWidth="1px"
            borderColor="calendar.border"
            borderRadius="14px"
            bg="calendar.surface"
          >
            {filterControls}
          </Box>
        )}

        <Tabs.Root
          as="section"
          aria-label="Calendar"
          lazyMount
          unmountOnExit
          mt={{ base: '13px', md: '20px' }}
          mx={{ base: '-10px', md: '0' }}
          value={state.view}
          onValueChange={({ value }) => setView(value as ViewId)}
          borderWidth="1px"
          borderColor="calendar.border"
          borderRadius="16px"
          bg="calendar.surface"
          overflow="hidden"
        >
          <Flex
            align={{ base: 'stretch', md: 'center' }}
            justify="space-between"
            direction={{ base: 'column-reverse', md: 'row' }}
            gap="13px"
            p={{ base: '13px', md: '18px' }}
            borderBottomWidth="1px"
            borderColor="calendar.border"
          >
            <Flex align="center" justify="space-between" gap="13px">
              <HStack gap="4px" aria-label="Change month">
                <IconButton
                  aria-label="Previous month"
                  onClick={() =>
                    change(current => ({
                      ...current,
                      month: shiftMonth(current.month, -1)
                    }))
                  }
                  {...controlProps}
                  minW={{ base: '44px', md: '38px' }}
                  minH={{ base: '44px', md: '38px' }}
                  p="0"
                >
                  <ChevronLeft size={16} />
                </IconButton>
                <IconButton
                  aria-label="Next month"
                  onClick={() =>
                    change(current => ({
                      ...current,
                      month: shiftMonth(current.month, 1)
                    }))
                  }
                  {...controlProps}
                  minW={{ base: '44px', md: '38px' }}
                  minH={{ base: '44px', md: '38px' }}
                  p="0"
                >
                  <ChevronRight size={16} />
                </IconButton>
              </HStack>
              <Flex
                align={{ base: 'flex-end', md: 'center' }}
                direction={{ base: 'column', md: 'row' }}
                gap={{ base: '1px', md: '10px' }}
              >
                <Heading
                  as="h2"
                  color="calendar.text"
                  fontSize={{ base: '20px', md: '23px' }}
                  fontWeight="500"
                  letterSpacing="-.03em"
                >
                  {monthLabel(state.month)}
                </Heading>
                <Button
                  variant="plain"
                  minH={{ base: '44px', md: 'auto' }}
                  p={{ base: '8px 3px', md: '3px' }}
                  color="calendar.link"
                  fontSize="12px"
                  fontWeight="500"
                  disabled={state.month === currentMonth()}
                  onClick={() =>
                    change(current => ({ ...current, month: currentMonth() }))
                  }
                  _disabled={{ color: 'calendar.subtle', opacity: 0.7 }}
                  _focusVisible={focusRing}
                >
                  Go to today
                </Button>
              </Flex>
            </Flex>
            <Tabs.List
              aria-label="Calendar representation"
              alignSelf={{ base: 'stretch', md: 'auto' }}
              display="grid"
              gridTemplateColumns="1fr 1fr"
              p="3px"
              borderWidth="1px"
              borderColor="calendar.controlBorder"
              borderRadius="11px"
              bg="calendar.inset"
            >
              {(
                [
                  ['grid', CalendarDays],
                  ['list', List]
                ] as const
              ).map(([view, Icon]) => (
                <Tabs.Trigger
                  key={view}
                  value={view}
                  minH={{ base: '44px', md: '36px' }}
                  px="12px"
                  borderRadius="8px"
                  color="calendar.muted"
                  fontSize="13px"
                  fontWeight="500"
                  _selected={{ bg: 'action.subtle', color: '#E8F0FF' }}
                  _focusVisible={focusRing}
                >
                  <Icon size={15} /> {view === 'grid' ? 'Grid' : 'List'}
                </Tabs.Trigger>
              ))}
            </Tabs.List>
          </Flex>
          <Tabs.Content value="grid" p="0">
            <LoadState
              pending={feedQuery.isPending && feedUrl !== null}
              error={feedQuery.error}
              emptyMessage={emptyMessage}
              retry={() => void feedQuery.refetch()}
            >
              <CalendarGrid
                month={state.month}
                projections={projections}
                isNarrow={isNarrow}
                compact={compactGrid}
                selectedKey={selectedKey}
                setSelectedKey={setSelectedKey}
                showDayInList={day => {
                  setFocusDay(day)
                  setView('list')
                }}
              />
            </LoadState>
          </Tabs.Content>
          <Tabs.Content value="list" p="0">
            <LoadState
              pending={feedQuery.isPending && feedUrl !== null}
              error={feedQuery.error}
              emptyMessage={emptyMessage}
              retry={() => void feedQuery.refetch()}
            >
              <CalendarList
                projections={projections}
                isNarrow={isNarrow}
                selectedKey={selectedKey}
                setSelectedKey={setSelectedKey}
              />
            </LoadState>
          </Tabs.Content>
        </Tabs.Root>
      </Container>
    </Box>
  )
}

import {
  Button,
  Flex,
  Heading,
  HStack,
  IconButton,
  Tabs
} from '@chakra-ui/react'
import { CalendarDays, ChevronLeft, ChevronRight, List } from 'lucide-react'
import {
  currentMonth,
  monthLabel,
  shiftMonth,
  type EventProjection,
  type ViewId
} from '../calendar'
import { controlProps, focusRing } from '../theme'
import { CalendarGrid, CalendarList, LoadState } from './CalendarViews'

export function CalendarPanel(props: {
  month: string
  view: ViewId
  projections: EventProjection[]
  isNarrow: boolean
  compactGrid: boolean
  selectedKey: string | null
  pending: boolean
  error: Error | null
  emptyMessage?: string
  onMonthChange: (month: string) => void
  onViewChange: (view: ViewId) => void
  onSelectedKeyChange: (key: string | null) => void
  onShowDayInList: (day: string) => void
  onRetry: () => void
}) {
  return (
    <Tabs.Root
      as="section"
      aria-label="Calendar"
      lazyMount
      unmountOnExit
      mt={{ base: '13px', md: '20px' }}
      mx={{ base: '-10px', md: '0' }}
      value={props.view}
      onValueChange={({ value }) => props.onViewChange(value as ViewId)}
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
              onClick={() => props.onMonthChange(shiftMonth(props.month, -1))}
              {...controlProps}
              minW={{ base: 'touchTarget', md: '38px' }}
              minH={{ base: 'touchTarget', md: '38px' }}
              p="0"
            >
              <ChevronLeft size={16} />
            </IconButton>
            <IconButton
              aria-label="Next month"
              onClick={() => props.onMonthChange(shiftMonth(props.month, 1))}
              {...controlProps}
              minW={{ base: 'touchTarget', md: '38px' }}
              minH={{ base: 'touchTarget', md: '38px' }}
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
              {monthLabel(props.month)}
            </Heading>
            <Button
              variant="plain"
              minH={{ base: 'touchTarget', md: 'auto' }}
              p={{ base: '8px 3px', md: '3px' }}
              color="calendar.link"
              fontSize="12px"
              fontWeight="500"
              disabled={props.month === currentMonth()}
              onClick={() => props.onMonthChange(currentMonth())}
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
              minH={{ base: 'touchTarget', md: '36px' }}
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
          pending={props.pending}
          error={props.error}
          emptyMessage={props.emptyMessage}
          retry={props.onRetry}
        >
          <CalendarGrid
            month={props.month}
            projections={props.projections}
            isNarrow={props.isNarrow}
            compact={props.compactGrid}
            selectedKey={props.selectedKey}
            setSelectedKey={props.onSelectedKeyChange}
            showDayInList={props.onShowDayInList}
          />
        </LoadState>
      </Tabs.Content>
      <Tabs.Content value="list" p="0">
        <LoadState
          pending={props.pending}
          error={props.error}
          emptyMessage={props.emptyMessage}
          retry={props.onRetry}
        >
          <CalendarList
            projections={props.projections}
            isNarrow={props.isNarrow}
            selectedKey={props.selectedKey}
            setSelectedKey={props.onSelectedKeyChange}
          />
        </LoadState>
      </Tabs.Content>
    </Tabs.Root>
  )
}

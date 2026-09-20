import {
  Box,
  Button,
  Checkbox,
  Collapsible,
  Flex,
  HStack,
  Spinner,
  Text
} from '@chakra-ui/react'
import { Filter } from 'lucide-react'
import {
  codexResetTypes,
  type CodexResetType,
  type DtsmFilterOptionsResponse
} from '@janejeon/calendars-shared'
import type { FeedId } from '../calendar'
import { resetLabels } from '../content'
import type { ExplorerState, IdSelection } from '../filters'
import { controlProps, focusRing } from '../theme'
import { FilterPopover } from './FilterPopover'
import { PlaceFilterPopover } from './PlaceFilterPopover'

export type DtsmFilterKey = 'venueIds' | 'organizerIds' | 'categoryIds'

function ResetCheckbox(props: {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <Checkbox.Root
      checked={props.checked}
      onCheckedChange={({ checked }) => props.onChange(Boolean(checked))}
      minH="touchTarget"
      px="10px"
      borderWidth="1px"
      borderColor="calendar.controlBorder"
      borderRadius="9px"
      bg={props.checked ? 'action.subtle' : 'calendar.inset'}
      color="calendar.text"
      fontSize="13px"
      _hover={{ bg: props.checked ? 'action.emphasized' : 'calendar.raised' }}
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

function DtsmFilterControls(props: {
  filters: ExplorerState['filters']['dtsm']
  options: DtsmFilterOptionsResponse
  onChange: (key: DtsmFilterKey, value: IdSelection) => void
}) {
  const model = props.options.filterModel!
  return (
    <>
      <Flex
        align={{ base: 'stretch', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap="8px"
      >
        <Text color="calendar.subtle" fontSize="12px" fontWeight="500">
          Places
        </Text>
        <PlaceFilterPopover
          selection={props.filters.venueIds}
          model={model}
          rawOptions={props.options.venues}
          defaultIds={props.options.defaultVenueIds}
          onChange={value => props.onChange('venueIds', value)}
        />
      </Flex>
      <Flex
        align={{ base: 'stretch', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap="8px"
      >
        <Text color="calendar.subtle" fontSize="12px" fontWeight="500">
          Type
        </Text>
        <FilterPopover
          label="Type"
          noun="types"
          selection={props.filters.categoryIds}
          choices={model.eventTypes}
          rawOptions={props.options.categories}
          onChange={value => props.onChange('categoryIds', value)}
        />
      </Flex>
      <Flex
        align={{ base: 'stretch', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        gap="8px"
      >
        <Text color="calendar.subtle" fontSize="12px" fontWeight="500">
          Organizer
        </Text>
        <FilterPopover
          label="Organizer"
          noun="organizers"
          searchable
          selection={props.filters.organizerIds}
          choices={model.organizers}
          rawOptions={props.options.organizers}
          onChange={value => props.onChange('organizerIds', value)}
        />
      </Flex>
    </>
  )
}

function FilterControls(props: {
  feed: FeedId
  filters: ExplorerState['filters']
  options?: DtsmFilterOptionsResponse
  optionsPending: boolean
  onOptionsRetry: () => void
  onDtsmChange: (key: DtsmFilterKey, value: IdSelection) => void
  onResetChange: (type: CodexResetType, checked: boolean) => void
}) {
  if (props.feed === 'codex')
    return (
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
            <ResetCheckbox
              key={type}
              checked={props.filters.codex.types.includes(type)}
              label={resetLabels[type]}
              onChange={checked => props.onResetChange(type, checked)}
            />
          ))}
        </Flex>
      </Flex>
    )

  return (
    <Flex
      align={{ base: 'stretch', md: 'center' }}
      direction={{ base: 'column', md: 'row' }}
      gap="12px"
      w="100%"
    >
      {props.options ? (
        <DtsmFilterControls
          filters={props.filters.dtsm}
          options={props.options}
          onChange={props.onDtsmChange}
        />
      ) : props.optionsPending ? (
        <HStack color="calendar.muted">
          <Spinner size="xs" /> <Text fontSize="13px">Loading filters…</Text>
        </HStack>
      ) : (
        <HStack justify="space-between" w="100%" gap="12px">
          <Text color="calendar.danger" fontSize="13px">
            Filters are unavailable. The saved calendar can still load.
          </Text>
          <Button {...controlProps} onClick={props.onOptionsRetry}>
            Retry
          </Button>
        </HStack>
      )}
    </Flex>
  )
}

export function ExplorerFilters(props: {
  feed: FeedId
  filters: ExplorerState['filters']
  isNarrow: boolean
  open: boolean
  activeFilters: number
  options?: DtsmFilterOptionsResponse
  optionsPending: boolean
  onOpenChange: (open: boolean) => void
  onOptionsRetry: () => void
  onDtsmChange: (key: DtsmFilterKey, value: IdSelection) => void
  onResetChange: (type: CodexResetType, checked: boolean) => void
}) {
  const controls = (
    <FilterControls
      feed={props.feed}
      filters={props.filters}
      options={props.options}
      optionsPending={props.optionsPending}
      onOptionsRetry={props.onOptionsRetry}
      onDtsmChange={props.onDtsmChange}
      onResetChange={props.onResetChange}
    />
  )

  if (!props.isNarrow)
    return (
      <Box
        as="section"
        aria-label={props.feed === 'dtsm' ? 'Event filters' : 'Reset filters'}
        minH="64px"
        p="11px 14px"
        borderWidth="1px"
        borderColor="calendar.border"
        borderRadius="14px"
        bg="calendar.surface"
      >
        {controls}
      </Box>
    )

  return (
    <Collapsible.Root
      open={props.open}
      onOpenChange={({ open }) => props.onOpenChange(open)}
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
              {props.feed === 'dtsm' ? 'Filter events' : 'Filter resets'}
            </span>
          </HStack>
          <Text color="calendar.muted" fontSize="11px">
            {props.activeFilters
              ? `${props.activeFilters} active`
              : props.feed === 'dtsm'
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
          {controls}
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}

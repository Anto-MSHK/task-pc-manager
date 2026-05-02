import { CalendarOutlined } from '@ant-design/icons';
import { DatePicker, Radio, Space } from 'antd';
import type { Dayjs } from 'dayjs';
import { DatePreset, useDateRangeStore } from '../store/dateRangeStore';

const { RangePicker } = DatePicker;

export function DateRangeFilter() {
  const preset = useDateRangeStore((state) => state.preset);
  const range = useDateRangeStore((state) => state.range);
  const setPreset = useDateRangeStore((state) => state.setPreset);
  const setRange = useDateRangeStore((state) => state.setRange);

  return (
    <Space wrap className="date-range-filter">
      <CalendarOutlined />
      <Radio.Group
        value={preset}
        onChange={(event) => setPreset(event.target.value as DatePreset)}
        optionType="button"
        buttonStyle="solid"
      >
        <Radio.Button value="today">Today</Radio.Button>
        <Radio.Button value="7d">7d</Radio.Button>
        <Radio.Button value="30d">30d</Radio.Button>
        <Radio.Button value="custom">Custom</Radio.Button>
      </Radio.Group>
      <RangePicker
        allowClear={false}
        showTime
        value={range}
        onChange={(value) => {
          if (value?.[0] && value[1]) {
            setRange(value as [Dayjs, Dayjs]);
          }
        }}
      />
    </Space>
  );
}

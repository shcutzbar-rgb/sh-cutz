-- Verksamhetens begärda öppettider: alla aktiva frisörer, alla dagar 10:00-20:00.
update working_hours
set is_active = false
where is_active = true;

insert into working_hours (barber_id, weekday, start_time, end_time)
select b.id, weekday, '10:00', '20:00'
from barbers b
cross join generate_series(0, 6) as weekdays(weekday)
where b.is_active = true;
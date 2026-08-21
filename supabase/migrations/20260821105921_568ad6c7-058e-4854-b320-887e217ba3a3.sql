delete from bookings where id='4b76a78d-e581-4ade-ae0a-e69f8cad22a1' or event_label='REGRESSION TEST — delete me';
delete from festive_board_attendance where source_booking_id in ('4b76a78d-e581-4ade-ae0a-e69f8cad22a1');
select 'cleaned';